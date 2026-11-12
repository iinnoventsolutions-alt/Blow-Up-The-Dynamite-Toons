# RFDR N3.16-B — Compatibility and Security Review

Status: **REVIEW COMPLETE; RELEASE NO-GO; N3.16 NOT CLOSED**.

Scope: read-only inspection of isolated FFmpeg boundary/sink, Electron main/preload and ARM64 packaging workflow, following successful N3.16 security CI at commit 73c2124f. This review does not authorize production wiring or branch merges.

## Confirmed by inspection and existing CI

- Electron BrowserWindow uses sandbox: true, contextIsolation: true and nodeIntegration: false; main IPC handlers use assertTrustedSender.
- Neither desktop/main.cjs, desktop/preload.cjs nor src/animatic-export.ts wires the isolated FFmpeg sink into the application.
- The encoder path is canonicalized and restricted to a direct executable in Electron resources; spawn uses shell: false.
- ARM64 packaged FFmpeg has been exercised with VP8 video and optional Opus audio and inspected using ffprobe in CI.
- N3.16 isolated tests cover ordering, invalid inputs, abort, cleanup and process argument structure.
- The separate Mediabunny feasibility gate remains failing for the previously documented Opus padding compatibility limitation.

## Open issues (blocking a release-ready claim)

1. **Intel/x64 compatibility unverified.** Existing isolated packaging workflow builds only ARM64; no Intel packaged FFmpeg runtime evidence.
2. **No Electron end-to-end user workflow.** No trusted IPC export contract, permissioned destination selection, renderer-to-main streaming/backpressure, progress/cancel protocol or real-project end-to-end export has been exercised inside a packaged Electron application.
3. **Unbounded temporary disk consumption.** Frame-count input and each-frame memory budgets do not impose a total raw-frame disk budget. At 64 MiB/frame, long projects can exhaust disk; enforce project size limits, available-space checks and cleanup on all failures.
4. **Encoder process execution time unbounded.** Probe has timeout, but sink finish does not; introduce maximum duration, abort-and-reap semantics and bounded diagnostics.
5. **Memory/output budget limitations.** Encoded output is capped at 512 MiB after encoding, but then loaded fully into memory. Define a bounded output streaming or file-based handoff and preflight output-size/disk budgets.
6. **Output/temporary data privacy.** Raw RGBA frames and PCM audio are stored unencrypted in OS temporary storage; assess restrictive permissions, lifecycle on crashes, and privacy expectations.
7. **Signing, notarization and licensing.** Current ad-hoc signing and LGPL build feasibility do not establish distribution readiness. Verify license notices, source/relinking obligations, Intel and ARM64 codesign, hardened runtime and notarization.
8. **Audio/video and resilience acceptance.** Validate real-project timing, duration, scene transitions, camera inheritance, export cancel/retry, app shutdown and crash recovery in a packaged Electron build.

## Recommendation / next checkpoint

**N3.16-C: targeted resource-limit and cancellation hardening**, remaining isolated. Add tests for disk budgets, process timeout and cleanup before N3.17. Subsequently prepare the Electron bridge as a separate explicitly approved integration checkpoint. Do not close N3.16 or declare N3.17 manual acceptance ready until those gaps are addressed.

Guardrails: keep Working, main, Draft PR #14 and production exporter unchanged; public distribution remains NO-GO.
