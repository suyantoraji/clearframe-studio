import { ExternalBlob } from "@caffeineai/object-storage";

/**
 * Object-storage helpers.
 *
 * Video files are stored off-chain; the backend keeps only an opaque `FileRef`
 * string. Uploads go through `ExternalBlob.fromBytes` so the storage gateway
 * records the MIME type and original filename, and downloads use `getBytes()`
 * so the saved file keeps its original name.
 *
 * A `FileRef` is the gateway direct URL produced by `StorageClient.getDirectURL`
 * (it already carries `blob_hash`, `owner_id`, and `project_id`), so it can be
 * addressed directly without rebuilding a `StorageClient`.
 */

/** Read a browser File into an uploadable blob with progress reporting. */
export async function fileToExternalBlob(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<ExternalBlob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const blob = ExternalBlob.fromBytes(bytes, file.type, file.name);
  return onProgress ? blob.withUploadProgress(onProgress) : blob;
}

/** Resolve a stored file reference into an inline-displayable URL. */
export function fileRefToUrl(fileRef: string): string {
  return ExternalBlob.fromURL(fileRef).getDirectURL();
}

/** Trigger a save-as download for a stored file reference. */
export async function downloadFileRef(
  fileRef: string,
  filename: string,
): Promise<void> {
  const bytes = await ExternalBlob.fromURL(fileRef).getBytes();
  const blob = new Blob([bytes]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|ogv)$/i;

/** Whether a filename looks like a supported video container. */
export function isVideoFilename(filename: string): boolean {
  return VIDEO_EXTENSIONS.test(filename);
}

/** Whether a filename looks like a still image (used for thumbnails). */
export function isImageFilename(filename: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i.test(filename);
}

/**
 * Delete a stored file by its `FileRef`.
 *
 * The `@caffeineai/object-storage` package exposes no delete API, so this
 * issues a `DELETE` against the blob resource the `FileRef` already points at
 * (the same gateway URL the upload and download paths use). The storage
 * gateway does not currently serve a per-blob `DELETE` route — blob reclamation
 * is owned by the backend canister and its background scrubber — so an
 * unsupported-method response (404/405/501) is treated as "the platform will
 * reclaim this blob on its own" and resolves without error. Genuine failures
 * (network errors, 403, 5xx) are surfaced so the caller can report them rather
 * than silently swallowing them.
 */
export async function deleteStoredFile(fileRef: string): Promise<void> {
  if (!fileRef) return;
  let response: Response;
  try {
    response = await fetch(fileRef, { method: "DELETE" });
  } catch (error) {
    throw new Error(
      `Could not reach storage to delete a file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  // 404/405/501 mean the gateway has no per-blob delete route; the backend
  // scrubber reclaims the blob, so this is not a failure the user can act on.
  if (response.ok || [404, 405, 501].includes(response.status)) return;
  throw new Error(
    `Storage refused to delete a file (${response.status} ${response.statusText}).`,
  );
}
