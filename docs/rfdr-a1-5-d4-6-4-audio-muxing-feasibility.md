# RFDR A1.5 D4.6.4 — Audio and WebM muxing feasibility

## Boundary
The D4.6.3 normal and stressed VP8 VideoEncoder probes passed. This checkpoint checks an independent 3-second, 48-kHz mono audio timeline: offline rendering of a 440-Hz tone for 1.5 seconds, 150 Opus packets of 960 samples (20 ms), explicit sample-derived AudioData timestamps, and encoder output timestamps. This is a diagnostic only, not an integrated project audio mixer.

## Proposed container strategy
A timestamp-aware WebM muxer must accept VP8 encoded video chunks and Opus encoded audio chunks with explicit timestamps, preserve monotonic PTS and durations, emit a finite seekable WebM, and handle Opus decoder configuration/codec delay. Existing package.json contains no muxer. No new dependency is selected or installed in this checkpoint.

## Acceptance before production integration
- Inspect security, maintenance, license, supply chain and packaged Electron compatibility for candidate muxers.
- Implement a disposable muxed-file proof of concept, then use ffprobe to verify video PTS and audio packet PTS; use ffmpeg to decode and measure video dissolve, audio amplitude, synchronization and 3-second duration.
- Include silent and mixed-track projects, cancellation, repeated export, unsupported codec, error cleanup and memory stress.
- Verify Electron ARM64 behavior and regression suites before any production path change.
- Keep existing MediaRecorder export as default and do not merge Working/main without explicit authorization.

## Current limitations
The audio probe does not produce a WebM, does not include storyboard project audio assets, and does not establish A/V synchronization. It is the first prerequisite for choosing a muxing implementation.
