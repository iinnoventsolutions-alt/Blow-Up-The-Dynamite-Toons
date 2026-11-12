# RFDR N3.10 — Deterministic WebM export architecture review

Status: **read-only review complete; production integration NOT authorized**.
Baseline: isolated prototype commit `ac63b78e178c3928ac22e8768ffc7d881ddd3bfe`.

## Current production boundary
- `src/animatic-export.ts` owns browser `AudioContext`, `MediaRecorder`, `canvas.captureStream(0)`, `requestFrame()`, live audio scheduling, cancellation and progress.
- `src/playback-render.ts` is the accepted playback visual source; `src/animatic-export.ts` currently calls `paintPlayback` directly.
- The existing `withWebmDuration` patch updates duration metadata, not individual frame PTS. Do not replace or modify the production exporter during this phase.

## Validated isolated components
1. `src/deterministic-project-adapter.ts`: read-only real-project frame and audio-window schedule, camera compatibility and transition metadata.
2. `src/deterministic-artwork-renderer.ts`: isolated browser canvas rendering using accepted `paintPlayback`; explicit indexed frame/timestamp and cancellation checks.
3. `src/deterministic-audio-mixer.ts`: 48-kHz mono Float32 PCM mix with clip trim, gain, overlap, silence, cancellation.
4. `tests/rfdr-n3-8-artwork-webm.mjs`: N3.8–N3.9.5 experimental FFmpeg VP8/Opus WebM encoding, explicit frame cadence, packet/PTS/visual/audio assertions, independent `opusdec` verification.
5. N3.9.5: eight 8-fps frames, 48,000 decoded samples, 51 matching Opus packets, independent decode success, 1.008-s container duration. The known FFmpeg WebM/Opus packet-header warning persists and is documented, not proven harmless on all platforms.

## Proposed production seams (design only)
- `DeterministicExportCoordinator`: capability/permission check, project snapshot, single export-session ID, cancellation, progress and output lifecycle. Separate opt-in entry point; existing exporter stays default.
- `FrameProducer`: sequential bounded frame iteration via isolated renderer; each frame carries index and integer timestampUs. Do not accumulate full-resolution frames in memory.
- `AudioProducer`: decode project audio assets and apply actual track mute/solo/trim/gain/offset; N3.3 mixer accepts *already decoded* PCM and is not a complete real-project audio adapter. Verify exact samples and silent exports.
- `EncoderBridge`: bounded producer/consumer transport to an explicitly packaged and security-reviewed encoder; FFmpeg on GitHub Actions does **not** prove an encoder exists in shipped Electron builds. Never depend on system Homebrew FFmpeg.
- `MuxAndVerify`: explicit video PTS, Opus pre-skip/discard padding, exact decoded samples, frame count, duration, silent/with-audio cases, and independent decoder compatibility.
- `ExportResult`: atomic temporary output and cleanup on success, cancellation or failure; surface actionable errors without disturbing existing export.

## Gaps and gates before any production integration
1. Electron desktop IPC/process architecture and trust boundary: validate paths, input limits, executable origin, resource cleanup, cancellation, sandbox/security and error propagation.
2. Distribution: licensing/LGPL obligations, pinned binary provenance, macOS ARM64 and Intel packaging, codesign/notarization, malware audit. Current public release is NO-GO.
3. Fidelity: actual project audio decoding and resampling, audio clip semantics, long-duration memory/backpressure, large/embedded images, camera and transition parity, multi-scene boundaries.
4. Media: variable fps and sizes, silence (no audio stream), exact end timestamps, retries, abort/retry, encoder errors and deterministic output validation.
5. CI: new independent tests and targeted desktop integration; later manual Electron acceptance on both architectures before enabling an opt-in production path.
6. The N1.1 Mediabunny gate remains failed due to the known Opus padding limitation. Do not silently classify that gate as passing.

## Controlled next step
**N3.11 — Isolated coordinator/encoder-bridge contract design and tests**: define interfaces and test bounded frame handoff, cancellation, cleanup, progress, and silent audio; no production exporter wiring, no binary distribution changes. Require explicit approval before any merge to `Working` or `main`, or modification to Draft PR #14.
