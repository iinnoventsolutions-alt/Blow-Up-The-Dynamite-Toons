# RI2.15.5-R1.1 — Read-only unofficial macOS production packaging readiness

**Decision: DESIGN REVIEW COMPLETE; IMPLEMENTATION NOT READY / RELEASE NO-GO.** No code, binaries, release artifacts, or protected branches changed in this checkpoint.

## Repository baseline directly inspected

- `package.json` app version `1.0.0`, `main=desktop/main.cjs`; `package:mac` runs `npm run build && electron-builder --mac dmg --arm64 --x64`.
- Electron Builder configuration lives in `package.json` `build` (no `electron-builder.yml` at reviewed path).
- `build.files` includes `dist/**/*`, `desktop/**/*`, `src/project-format.js`, `package.json`, `src/build-info.json`; **no FFmpeg runtime path or `extraResources` declared**.
- `build.mac.identity` is `-` (ad hoc identity), not Apple Developer ID; notarization not configured.
- `desktop/main.cjs` uses a **developer-only opt-in**: `RFDR_ENABLE_PRODUCTION_EXPORT === '1'`; packaged apps additionally require `rfdr-test-export.marker` under `process.resourcesPath` and `RFDR_TEST_EXPORT === '1'`. The default branch path creates the disabled isolated export runtime. The existing code must **not** be characterized as a production-ready FFmpeg export switch.
- User-confirmed accepted runtime staging locations, untouched: `~/Projects/RI2-15-C2-ARM64-STAGED/ffmpeg-runtime` and `~/Projects/RI2-15-C2-INTEL-STAGED/ffmpeg-runtime`.
- User-confirmed source/evidence review folder `~/Projects/RI2-C34H-Source-Review`; 27 CI evidence files per architecture; C3.4-L source/config checks passed. This folder is **internal-only**, not yet a verified recipient distribution bundle.
- C3.4-O records user-reported legal/compliance review completed with no adjustments; individual reviewer decision record not independently inspected.
- R1.0 authorizes *planning* unofficial distribution without Developer ID; it does not approve production packaging or shipping.

## Proposed fail-closed packaging contract (not implemented)

1. Produce **separate arm64 and x64 DMGs**, each containing only its matching previously accepted FFmpeg executable and linked libvpx/Opus dylibs. Never blend architectures or silently download new codec binaries.
2. Define an explicit versioned `extraResources` mapping for each architecture to a controlled immutable staging copy, with an allowlist for `bin/ffmpeg`, `lib/libvpx.12.dylib`, `lib/libopus.0.dylib`; never copy runtime into `app.asar`. Include license/notice and source-access materials only after approved placement.
3. Pre-package check **exact SHA-256** and `file` Mach-O architecture for all six accepted binaries, plus `otool -L` and `otool -l`/RPATH closure, including absence of unintended Homebrew/external dependencies. Abort on mismatch or missing files; do not mutate originals.
4. After packaging, verify DMG contents, `Contents/Resources` runtime paths, code signature state, runtime executability, and a fresh post-package checksum manifest. Reconcile against original staged digests where packaging/signing leaves bytes intact; if signing changes bytes, document and validate both pre/post signing separately.
5. Preserve existing animatic export and project persistence. A **separate, explicit approved production implementation** must replace the developer-only test-marker/environment-variable path and must remain disabled until tested; never ship a test marker as a release toggle.
6. Provide a recipient-facing license/notice/source delivery arrangement and document how users may inspect/replace relevant libraries where legally required, subject to reviewer guidance. Do not assume copying source tarballs into a DMG alone satisfies LGPL.
7. Without Developer ID/notarization, disclose Gatekeeper restrictions and provide only macOS-supported, per-app user-mediated opening instructions. Do not disable system-wide security or erase quarantine broadly.
8. Run targeted ARM64/native Intel packaged acceptance including FFmpeg-specific WebM export, duration, camera, audio, cancellation/recovery, save/reopen, existing export regression, integrity and security checks. Do not repeat earlier native runtime tests unnecessarily.

## R1.1 gate matrix

| Gate | Status | Required next step |
|---|---|---|
| Repository packaging inventory | PASS | Baseline recorded |
| Runtime architecture and checksum contract | DESIGN ONLY | Implement after approval |
| Runtime and notices in `extraResources` | MISSING | Implement after approval |
| Production export wiring | TEST-ONLY / GATED | Design and implement separately after approval |
| Recipient source/notice placement | NOT VERIFIED | Confirm approved packaging arrangement |
| Ad hoc, unnotarized distribution disclosure | STRATEGY DEFINED | Add user documentation after approval |
| Signed/notarized Apple distribution | DEFERRED by owner | Do not imply completed |
| Release acceptance | NOT STARTED | Explicit owner approval and tests |

## R1.2 authorization boundary

Before making changes to packaging configuration, app export code, tests or runtime staging, request **explicit owner authorization for an isolated implementation branch**. Preserve `RFDR-RI2-Production-Readiness` as documentation baseline if desired; never modify `Working`, `main` or Draft PR #14 without separate explicit approval. No release/distribution authorization is implied.

**R1.1 read-only assessment: COMPLETE. Production packaging: NOT READY. Distribution NO-GO.**
