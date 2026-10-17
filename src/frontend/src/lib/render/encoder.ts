/**
 * Browser-side video encoder.
 *
 * Muxes processed frames back into a video entirely on the user's device —
 * footage never leaves the browser. The caller's `drawFrame` seeks the source
 * to each frame's timestamp and paints the processed result onto a canvas,
 * which is captured with `MediaRecorder`; the original audio track is routed
 * into the same recorder through a `MediaStreamAudioDestinationNode` so the
 * export keeps its soundtrack. MP4 is preferred where the browser can encode
 * it, with a WebM fallback when it cannot.
 */

export type RenderFormat = "mp4" | "webm";

export interface EncoderSupport {
  /** The container the browser will actually produce. */
  format: RenderFormat;
  mimeType: string;
  /** Whether the original audio track can be carried into the export. */
  audio: boolean;
}

export interface EncodeOptions {
  /** Source video whose audio track is preserved. */
  source: HTMLVideoElement;
  /** Canvas the processed frames are drawn onto. */
  canvas: HTMLCanvasElement;
  /** Total frames to encode. */
  frameCount: number;
  /** Playback rate of the source, used to derive the output frame rate. */
  playbackRate: number;
  /**
   * Draws the processed frame for a given index onto the canvas. May be async:
   * the caller seeks the source to that frame's timestamp and awaits the seek
   * before painting, so every output frame is the processed frame at that time.
   */
  drawFrame: (index: number) => void | Promise<void>;
  /** Reports progress in the range 0–1. */
  onProgress: (progress: number) => void;
  /** Resolves true when the caller wants the encode to stop. */
  isCancelled: () => boolean;
}

export interface EncodeResult {
  blob: Blob;
  format: RenderFormat;
  mimeType: string;
  /** Whether the original audio track made it into the export. */
  audioIncluded: boolean;
}

const MP4_CANDIDATES = [
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  'video/mp4;codecs="avc1.42E01E"',
  "video/mp4",
];

const WEBM_CANDIDATES = [
  'video/webm;codecs="vp9,opus"',
  'video/webm;codecs="vp8,opus"',
  "video/webm",
];

function pickMimeType(candidates: string[]): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return null;
}

/**
 * A single `MediaElementAudioSourceNode` may be created per media element for
 * the lifetime of the page — a second `createMediaElementSource` on the same
 * element throws `InvalidStateError`. Both the audio context and the per-element
 * source node are therefore cached and reused across renders, so re-rendering
 * the same clip keeps its soundtrack instead of silently dropping it.
 */
let sharedAudioContext: AudioContext | null = null;
const sourceNodes = new WeakMap<
  HTMLMediaElement,
  MediaElementAudioSourceNode
>();

function getAudioContext(): AudioContext | null {
  if (sharedAudioContext) return sharedAudioContext;
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextCtor) return null;
  sharedAudioContext = new AudioContextCtor();
  return sharedAudioContext;
}

function getSourceNode(
  context: AudioContext,
  element: HTMLMediaElement,
): MediaElementAudioSourceNode {
  const existing = sourceNodes.get(element);
  if (existing) return existing;
  const node = context.createMediaElementSource(element);
  // Keep normal playback audible while the element is routed through the graph.
  node.connect(context.destination);
  sourceNodes.set(element, node);
  return node;
}

/** Detect the best container and audio support the current browser offers. */
export function detectEncoderSupport(): EncoderSupport {
  const mp4 = pickMimeType(MP4_CANDIDATES);
  if (mp4) {
    return { format: "mp4", mimeType: mp4, audio: true };
  }
  const webm = pickMimeType(WEBM_CANDIDATES);
  if (webm) {
    return { format: "webm", mimeType: webm, audio: true };
  }
  return { format: "webm", mimeType: "video/webm", audio: false };
}

/** Human-readable container label for the export summary. */
export function formatLabel(format: RenderFormat): string {
  return format === "mp4" ? "MP4" : "WebM";
}

/** File extension for a container. */
export function formatExtension(format: RenderFormat): string {
  return format === "mp4" ? "mp4" : "webm";
}

/**
 * Encode processed frames into a video blob.
 *
 * The canvas is captured at a fixed frame rate derived from the source
 * playback rate, and the source's audio is piped through a media-stream
 * destination so the export keeps its original soundtrack. The returned blob
 * is empty when the caller cancels mid-encode.
 */
export async function encodeVideo(
  options: EncodeOptions,
): Promise<EncodeResult> {
  const {
    source,
    canvas,
    frameCount,
    playbackRate,
    drawFrame,
    onProgress,
    isCancelled,
  } = options;

  const support = detectEncoderSupport();
  const fps = Math.max(1, Math.round(30 * playbackRate));
  const stream = canvas.captureStream(fps);

  let audioIncluded = false;
  try {
    const audioContext = getAudioContext();
    if (audioContext) {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      const sourceNode = getSourceNode(audioContext, source);
      const destination = audioContext.createMediaStreamDestination();
      sourceNode.connect(destination);
      for (const track of destination.stream.getAudioTracks()) {
        stream.addTrack(track);
      }
      audioIncluded = true;
    }
  } catch {
    audioIncluded = false;
  }

  const recorder = new MediaRecorder(stream, { mimeType: support.mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();

  const frameDurationMs = 1000 / fps;
  let cancelled = false;
  for (let index = 0; index < frameCount; index += 1) {
    if (isCancelled()) {
      cancelled = true;
      break;
    }
    // `drawFrame` seeks the source to this frame's timestamp and paints the
    // processed result, so each output frame is the processed frame at that
    // time rather than one repeated frame.
    await drawFrame(index);
    onProgress((index + 1) / frameCount);
    // Yield to the event loop so the recorder can capture the painted frame.
    await new Promise((resolve) => setTimeout(resolve, frameDurationMs));
  }

  recorder.stop();
  await stopped;

  if (cancelled) {
    return {
      blob: new Blob([], { type: support.mimeType }),
      format: support.format,
      mimeType: support.mimeType,
      audioIncluded: false,
    };
  }

  return {
    blob: new Blob(chunks, { type: support.mimeType }),
    format: support.format,
    mimeType: support.mimeType,
    audioIncluded,
  };
}
