# RFDR — Consolidated Production Integration and Release Acceptance

Status: IN PROGRESS. N3.17-T isolated Electron/ARM64 fixture passed; **not production enabled**.

## Verified baseline
- N3.17-T real Electron IPC → packaged ARM64 FFmpeg → save → ffprobe passed.
- Production `desktop/main.cjs` creates the isolated runtime **disabled**.
- Production `desktop/preload.cjs` does not expose isolated export controls.
- `src/animatic-export.ts` uses MediaRecorder, `paintPlayback`, and `scheduleAudio`.
- N3.17-T uses synthetic 32×32 frames and no audio; it does **not** prove real storyboard video/audio fidelity.

## One consolidated implementation and acceptance phase
1. Connect a main-trusted project snapshot and authenticated IPC to the existing project lifecycle. Do not accept renderer-controlled filesystem paths or arbitrary dimensions as authority.
2. Add a production preload bridge for start, progress, cancel, and completion; ensure window teardown aborts active exports.
3. Implement deterministic rendering of real storyboard frames, including camera transitions, sequential keyframes, masks, and timing; implement actual audio capture/PCM delivery. Reuse existing playback semantics, not synthetic test fixtures.
4. Offer FFmpeg WebM export through the existing export UI while retaining the MediaRecorder fallback until accepted.
5. Test a real project with audio, transitions, camera motion, cancel/retry, save/reopen, invalid requests, save cancellation, and failure cleanup. Verify exported video and audio with ffprobe.
6. Package and manually accept ARM64 on Apple Silicon and x64 on Intel; verify dylibs, LGPL distribution obligations, signing/notarization and malware scan.
7. Review results and request explicit authorization **before** any merge into Working/main or modification of Draft PR #14.

## Release gates
- Real storyboard fidelity and audio: PENDING
- Production UI and preload wiring: PENDING
- ARM64 real-project manual acceptance: PENDING
- Intel compatibility: PENDING
- Licensing/distribution and signed/notarized installer: PENDING
- Public distribution: NO-GO

Do not treat the synthetic N3.17-T PASS as any of these pending release gates.
