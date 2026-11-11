# RFDR A1.5 D4.6.3 — Isolated deterministic export prototype

## Scope and isolation
This checkpoint prototypes **video frame encoding only**. It does not replace the production MediaRecorder path, does not add a runtime dependency, and does not generate a muxed WebM. The standalone browser probe exercises the same fixed 72-frame, 24-fps storyboard timeline as D4.6.2.

## Video experiment
The prototype uses a trustworthy localhost origin, a VP8 VideoEncoder, and VideoFrame timestamps computed as round(frameIndex * 1_000_000 / fps). It runs twice: normal and with deliberate 65 ms main-thread stalls every 12 frames. It verifies encoded chunk count, strictly increasing timestamps, and exact correspondence with storyboard timestamps. The test records JSON evidence in diagnostic-output. This establishes only encoder-level timestamp control, not decoded WebM timing or audio synchronization.

## Audio and muxing feasibility gates (not yet implemented)
1. Check AudioEncoder.isConfigSupported for Opus in the target Electron renderer, not only Playwright Chromium.
2. Render the existing mix offline at a fixed sample rate; encode AudioData with timestamps derived from sample positions, not AudioContext.currentTime.
3. Evaluate a maintained, security-reviewed timestamp-aware WebM muxer capable of VP8/Opus and finite duration. No muxer is currently installed. Compare licensing, maintenance, security and Electron packaging before selecting a dependency.
4. Decode muxed output using ffprobe/ffmpeg; verify frame PTS, dissolve samples, audio start/stop, duration, A/V synchronization, and silent projects.
5. Validate cancellation and repeated export; verify memory use, encoder flush/close, and failed codec/muxer cleanup.
6. Run Electron ARM64 installer acceptance and existing camera, audio, transition, and export regression gates.

## Decision rule
A successful D4.6.3 video probe permits an isolated muxing/audio design checkpoint, **not** a production migration or PR merge. Retain MediaRecorder as default. Do not modify Working or main without explicit approval.
