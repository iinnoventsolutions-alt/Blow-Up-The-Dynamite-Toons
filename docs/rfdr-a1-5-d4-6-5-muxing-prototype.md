# RFDR A1.5 D4.6.5 — VP8/Opus WebM muxing prototype

## Starting evidence
D4.6.3 verified 72 VP8 frames at 24 fps under normal and delayed-render conditions, with explicit timestamps. D4.6.4A encoded 150 Opus input blocks into 151 chunks; decoded 144,648 samples for an intended 144,000 samples (648 excess, 13.5 ms), with a 3.0135 s decoded endpoint. Therefore WebM muxing must explicitly account for Opus codec delay and end trimming; merely combining encoded chunks is not an acceptable pass.

## Isolation and implementation gates
1. Select a timestamp-aware WebM muxer supporting EncodedVideoChunk VP8 and EncodedAudioChunk Opus, including codec private data, track timestamps, duration, and Opus discard padding. Record license, maintenance, dependency footprint, security and Electron compatibility. Do not add it to production dependencies until reviewed.
2. In a standalone test only, generate 72 frames with VideoEncoder at 24 fps, 3 seconds of audio with AudioEncoder at 48 kHz, and mux both into one .webm file.
3. Validate using ffprobe: both tracks present, video PTS monotonic and approximately 41.667 ms spaced, audio PTS monotonic, duration 3 seconds within a defined tolerance, codec metadata correct.
4. Decode with ffmpeg: 72 expected visual frames, 6-frame dissolve in the intended time window, decoded audio exactly 144,000 samples after container-level trimming; no audible discontinuity at beginning/end. If decoder behavior differs, record it and block acceptance.
5. Run normal and deliberately stalled render variants. Confirm timestamps do not drift when render timing varies.
6. Check silent exports, cancellation, repeated exports, unsupported codec handling, memory, and packaged Electron ARM64 before any production integration.

## First gate: toolchain capability
The initial workflow probes ffmpeg/ffprobe availability and encoder/decoder formats in the macOS CI runner, records versions, and confirms production build. This is **not** a WebM muxed-file prototype or synchronization acceptance. Proceed to muxer selection/implementation only after this gate is reviewed.

## Protected scope
No modifications to src/animatic-export.ts, production MediaRecorder defaults, package.json, Working, main, or Draft PR #14 without explicit approval.
