# RFDR N3.17-A — Electron Export IPC Contract and Threat Model

Status: DESIGN + CONTRACT REGRESSION ONLY. No Electron production wiring or manual acceptance.

## Opt-in API
- Renderer invokes an explicit deterministic export start operation; existing animatic export remains the default.
- Main process owns destination selection, temp directories, packaged encoder resolution, process lifecycle and atomic final file move.
- Request is JSON-safe metadata only: project identifier, validated dimensions, fps and output name; no renderer-provided executable path, filesystem path, shell arguments, or unbounded frame payload.
- Main issues an opaque session ID, associates it with the trusted BrowserWindow sender and refuses cross-window or stale session requests.
- Progress and cancellation use session-scoped events and requests; cancellation is idempotent and kills/reaps FFmpeg before cleaning raw temporary assets.
- Artwork transfer must use bounded batches/acknowledgements (or a main-owned stream) with monotonic frame indices, strict pixel size and global disk quota.
- Audio is limited to 48 kHz mono PCM with duration/byte budgets; missing audio produces silent video.
- Completion returns a validated output result, not an arbitrary main-process path; user cancellation must leave no partial destination output.
- On window close, app quit, encoder failure or timeout, terminate child, close file handles and delete session temporary data.

## Threat and regression matrix
| Threat | Expected rejection / assertion |
|---|---|
| Untrusted sender | Trusted-sender validation before session creation |
| Renderer path/command injection | Request schema disallows paths, commands and extra properties |
| Oversized/invalid dimensions | Reject before allocation |
| Oversized frame/audio/disk use | Enforce byte budget and backpressure |
| Out-of-order frames | Reject without encoding |
| Cross-session cancellation | Reject session ownership mismatch |
| Repeated cancellation | Idempotent; no orphan process |
| Encoder hang | Deadline and child reaping |
| Export failure | No partial output; cleanup |
| Crash/close | Session teardown and stale temp recovery |

## Gate for N3.17-B
Implement isolated, testable request validator and session coordinator first, with no changes to desktop/main.cjs, desktop/preload.cjs or src/animatic-export.ts. Only after passing contract tests should actual opt-in Electron IPC wiring be proposed and separately authorized.

Release gates remain: ARM64 Electron end-to-end acceptance, Intel packaged encoder evidence, licensing, signing and notarization. Working/main/Draft PR #14 untouched. Public distribution NO-GO.
