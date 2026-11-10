# RFDR A1.5 D4.6 — Deterministic export architecture assessment

Status: investigation only; no production changes or merges.

## Verified implementation
- `src/animatic-export.ts` paints numbered storyboard frames into a canvas, submits frames with `CanvasCaptureMediaStreamTrack.requestFrame()`, and records a live `MediaStream` using `MediaRecorder`.
- Frame submission is gated by `requestAnimationFrame` and elapsed `AudioContext.currentTime`. It emits at most one storyboard frame per animation callback, preserving source order but not a guaranteed presentation timestamp.
- Audio is scheduled against the audio clock through `scheduleAudio` and captured live via `MediaStreamAudioDestinationNode`.
- `withWebmDuration` corrects container duration metadata; it does not retime individual encoded video frames.
- `package.json` has no declared WebCodecs muxer or bundled FFmpeg runtime dependency. The packaged app contains `dist`, `desktop`, and selected project files.

## Evidence
D4.5.1 Actions run 42777642109: four instrumented browser runs; 3/4 strict timeline passes. One failed run had median frame submission delay ~952 ms, max ~1346 ms, and encoded dissolve starting at ~1.583 s. Other runs had median delays ~29–48 ms and passed. Telemetry recorded 72–74 submissions, including frame-index resets in some runs; therefore submissions must be separated by export session before comparing per-frame timings.

## Candidate approaches
1. **Tune live MediaRecorder capture:** smallest change; preserves existing Electron and browser support. Cannot claim deterministic timestamps, and under load may drift even with ordered frame submissions. Not sufficient without stronger repeatable evidence.
2. **WebCodecs VideoEncoder + timestamp-aware muxer:** render each storyboard frame independently, create `VideoFrame` with explicit microsecond timestamps, encode and mux to a supported container. Potential deterministic video timing, but requires capability checks, muxer/security/dependency review, explicit handling of encoder backpressure, and separately rendered/muxed audio. Electron version support must be tested, not assumed.
3. **Offline frame/audio rendering with desktop-side encoding:** may offer deterministic presentation timestamps with a supported encoder. Requires security review of Electron IPC, packaged encoder availability/licensing/signing, cancellation, memory/disk usage, and cross-platform behavior. Must not silently depend on the developer machine's Homebrew FFmpeg.

## D4.6 acceptance prerequisites
1. Tag every export session with a unique ID, log start/end, and include session ID in each frame event.
2. Correlate only the specific exported WebM to its own frame events; reject missing/duplicate/nonmonotonic frame indices and unexpected counts.
3. Collect actual encoded packet/frame PTS values with ffprobe, not just sampled colors or patched container duration.
4. Run multiple exports under ordinary and stressed conditions; measure dissolve timing, audio start and A/V sync, exact duration, abort/retry, and silent export.
5. Prototype a deterministic path on an isolated branch only after capability and security review; preserve existing accepted camera, transition, and audio behaviors.
6. Keep draft PR #14 unmerged; do not modify Working or main without explicit approval.

## Decision
Do not merge the current D4.2 scheduler as a definitive timing fix. Start with session-specific telemetry and timestamp feasibility testing. The choice of encoder remains open pending those measurements.
