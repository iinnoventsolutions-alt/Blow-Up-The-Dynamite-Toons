# RFDR-A1.5 D4.6.5N — Production integration readiness assessment

**Status:** architecture review complete; **production integration NOT authorized**. Evidence: D4.6.5I/J/K/L/L.1/L.2/M prototype workflows, including Electron CI run 42961493688. No changes to Working, main, or draft PR #14.

## Confirmed findings
- Explicit VideoFrame timestamps plus WebCodecs VP8 encoding and WebM muxing produced 72-frame/3-second and 144-frame/6-second deterministic prototypes in normal/stressed Chromium tests. Decoded dissolve color checks and packet timing passed.
- Browser WebCodecs Opus + webm-muxer@5.1.4 produced 648 excess decoded samples (13.5 ms) for a 3-second 48-kHz fixture. In-place stream copy did not solve the padding.
- Experimental EBML final-audio SimpleBlock to BlockGroup with positive DiscardPadding corrected decoded samples to 144000/3s and 288000/6s, preserving decoded video in the tested fixtures.
- Silent six-second VP8 WebM reported 5.958 seconds until existing Info.Duration metadata was patched in place to 6.000 seconds; Chromium and Electron smoke playback/seeking then passed.
- Electron CI run 42961493688 tested silent and audio-containing six-second WebM in the project's Electron runtime: duration, dimensions, seeking and playback passed. This is **not** packaged ARM64 acceptance or audible sync verification.
- Isolated encoder reset/close/retry succeeded; actual application export cancellation and cleanup remain untested.

## Production blockers and risks
1. **Container correctness / indexing:** The experimental Opus patch rewrites an EBML Cluster, changes its length and possibly Segment length, but does not update SeekHead/Cues byte positions or CRCs. It assumes the final audio block is SimpleBlock on track 2, that the final block is in a supported Cluster, and that fixed-size EBML size fields can accommodate the change. These assumptions are not valid for arbitrary WebM outputs. Require a maintained muxer with supported Opus padding metadata or a fully validated EBML rewrite including offsets, CRCs, unknown-size elements and lacing. Fail closed for unsupported layouts.
2. **Duration correction:** In-place patch requires exactly one existing Info.Duration float of width 4 or 8 and known TimestampScale; absent/ambiguous elements need a supported muxing strategy, not silent fallback. Test 0, 1, 23/24/25 fps, fractional FPS, long recordings, varied panel lengths and very large files.
3. **Audio timing and fidelity:** Test variable sample rates/channels, initial codec delay, multiple audio clips, gaps, trims, fades, overlap, gain, synchronization to video, actual audible playback, and exact decoded sample counts. Do not infer audible sync from HTMLMediaElement playback success.
4. **Cancellation / backpressure:** VideoEncoder/AudioEncoder queue sizes, flush errors, abort during render/encode/mux/finalize/save, stale session isolation, retries, disposal of VideoFrame/AudioData, bounded memory, and filesystem cleanup require application-level gates.
5. **Packaging / supply chain:** webm-muxer@5.1.4 and esbuild@0.28.2 are installed only in CI with --no-save; not in production dependencies. Assess muxer maintenance, license, security advisories, lockfile integrity, bundled size, electron-builder allowlist, code signing and malware checks. No Homebrew FFmpeg runtime dependency.
6. **Feature parity:** Existing src/animatic-export.ts uses MediaRecorder with live AudioContext clock; new path needs deterministic offline audio composition, transitions, camera keyframes/masks, frame duration, export progress, cancellation, silent projects, legacy projects and fallback handling. Avoid presenting a fallback as deterministic if it still uses live MediaRecorder.
7. **Evidence gaps:** no packaged ARM64 DMG manual acceptance, no end-to-end storyboard Export workflow, no full browser/UI regression matrix, no actual audio listening/AV-sync verification, and no broad EBML compatibility fuzz/property tests.

## Recommended controlled implementation (requires separate approval)
- **N1 — Architecture decision / dependency gate:** Compare maintained muxer candidates and offline encoder option. Select supported container/audio end-trim strategy; document licensing, Electron capability, dependency integrity, and threat model. Prefer native muxer metadata support over bespoke EBML patching.
- **N2 — Red tests first:** Add failing production-facing export regression fixtures covering unequal panels, dissolves, camera motion, audio trims, silence, cancellation, retries and packet PTS. Keep tests isolated from Working.
- **N3 — Feature-flagged adapter:** Build a separate deterministic renderer/encoder/muxer behind a disabled-by-default experimental flag; preserve current exporter and session-specific diagnostics. Enforce queue bounds and cleanup.
- **N4 — Automated matrix:** normal/stress/repeat, 3/6/long-duration, audio/silent, cancellation, packet-level PTS, exact samples, visual transition checks, Electron runtime, full UI suite, build and security scan.
- **N5 — ARM64 manual gate:** Install signed/ad-hoc ARM64 DMG on target M1 Mac, validate export with/without audio, dissolve timing, seeking, playback sound, cancellation/retry, project save/reopen and legacy compatibility. Capture results before proposing any merge.
- **N6 — Controlled PR:** review diff and provenance, prepare a draft PR to Working only after N1–N5, and merge only with explicit user authorization; main remains untouched.

## Decision
**D4.6.5N readiness review: COMPLETE. Production implementation: NOT READY.**
The prototype validates technical feasibility, not a production-safe muxing implementation. Next gate should be N1 dependency/muxer architecture selection, without production edits or merges.
