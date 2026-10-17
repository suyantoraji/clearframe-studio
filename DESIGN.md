# Design Brief

## Direction

Signal Console — a dark, studio-grade video cleanup workspace that reads like a broadcast signal-processing desk, not a consumer video editor.

## Tone

Industrial/utilitarian precision: near-black charcoal surfaces, 1px hairline panel divisions, and a hot amber "recording" accent that makes every active tool feel armed and live.

## Differentiation

Every numeric value — timecodes, slider readouts, render percentages — is set in tabular monospace, so the interface reads like calibrated equipment rather than a web form.

## Color Palette

| Token      | OKLCH         | Role                                            |
| ---------- | ------------- | ----------------------------------------------- |
| background | 0.16 0.008 60 | Warm near-black app shell                       |
| foreground | 0.95 0.005 70 | Primary text                                    |
| card       | 0.2 0.008 60  | Raised panel surfaces                           |
| primary    | 0.78 0.16 65  | Signal amber — CTAs, active tools, progress     |
| accent     | 0.72 0.13 195 | Electric teal — mask overlays, secondary states |
| muted      | 0.24 0.008 60 | Inactive rails, secondary fills                 |
| canvas     | 0.11 0.006 60 | Video preview surface (darker than shell)       |
| destructive| 0.64 0.2 25   | Cancel render, delete project                   |

## Typography

- Display: Space Grotesk — headings, panel titles, tool labels
- Body: DM Sans — control labels, descriptions, project metadata
- Mono: JetBrains Mono — timecodes, slider values, percentages, durations
- Scale: hero `text-4xl md:text-5xl font-bold tracking-tight`, h2 `text-lg font-semibold tracking-tight`, label `text-[11px] font-semibold tracking-widest uppercase text-muted-foreground`, body `text-sm`

## Elevation & Depth

Dark surfaces stack by lightness (canvas 0.11 → background 0.16 → card 0.20 → popover 0.23) with hairline borders; shadows are deep and soft (`shadow-panel`, `shadow-elevated`) and never glow.

## Structural Zones

| Zone          | Background          | Border            | Notes                                              |
| ------------- | ------------------- | ----------------- | -------------------------------------------------- |
| Header        | `bg-card`           | `border-b`        | Project name, render progress readout, account     |
| Tool rail     | `bg-sidebar`        | `border-r`        | Vertical masking tools; active tool = amber fill   |
| Preview stage | `bg-canvas`         | `border`          | Checkerboard frame, scrubber + frame-step controls |
| Control panel | `bg-card`           | `border-l`        | Dense slider stack + background-removal section    |
| Dashboard     | `bg-background`     | —                 | Project grid on `bg-muted/30` alternating rows     |

## Spacing & Rhythm

Panels use 16px internal padding, 12px between control groups, 8px between a label and its slider; the shell is full-bleed with no page gutters so the workspace feels like an application window.

## Component Patterns

- Buttons: 6px radius, amber fill for primary, `bg-secondary` for neutral, teal outline for tool actions; hover lifts to `shadow-subtle`
- Cards: 8px radius, `bg-card` with 1px `border`, `shadow-panel` on raised project tiles
- Badges: pill or 4px radius, uppercase mono text — teal for "AI"/processing, amber for active, muted for idle
- Sliders: 2px track, 14px circular thumb, right-aligned tabular-mono value
- Toggles: 36×20 pill, teal when on

## Motion

- Entrance: `animate-fade-in` 250ms ease-out on panels and project tiles
- Hover: `transition-smooth` 300ms on buttons, tools, and cards
- Decorative: `animate-render-pulse` on the recording dot, `animate-scan-sweep` shimmer across an active render bar, `animate-progress-stripe` on indeterminate work

## Constraints

- Dark mode is canonical; light mode is a fallback console theme only
- No purple, no decorative gradients, no glow/neon shadows
- Video preview surfaces must keep strong contrast and a checkerboard transparency frame
- All processing is on-device; never imply footage is uploaded
- Do not reserve UI space for batch queues or audio cleanup

## Signature Detail

Tabular monospace numerics on every readout — the app's tell that you are operating calibrated equipment, not filling out a form.
