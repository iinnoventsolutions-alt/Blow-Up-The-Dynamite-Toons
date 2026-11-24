# RI2.15.5-C1 — Read-only FFmpeg packaging integration review

**Status: REVIEW COMPLETE; integration changes NOT authorized or implemented.** Source inspected on branch `RFDR-RI2-Production-Readiness` on 2026-11-20.

## Confirmed source findings

1. `package.json` `build.files` includes `dist/**/*`, `desktop/**/*`, `src/project-format.js`, `package.json`, and `src/build-info.json`. It does not explicitly stage `bin/ffmpeg`, `lib/*.dylib`, or the source license inventory under `release-audit/licenses/`. No `extraResources` declaration exists in the inspected package config.
2. `desktop/isolated-ffmpeg.cjs` resolves the packaged executable as `path.join(resourcesPath,'ffmpeg')`, requires it to be a direct child of `Contents/Resources`, and rejects an external symlink. This conflicts with the validated relocated runtime's `bin/ffmpeg` + `lib/*.dylib` layout. Placing only `ffmpeg` at Resources root would also break its existing `@executable_path/../lib/` linkage.
3. `desktop/isolated-ffmpeg-sink.cjs` uses the above resolver to spawn FFmpeg for WebM export, so a runtime layout correction must preserve the resolver's symlink safety, executable permissions and cancellation behavior.
4. `desktop/main.cjs` gates the isolated export backend behind `RFDR_ENABLE_PRODUCTION_EXPORT=1`; in packaged mode it additionally requires a `rfdr-test-export.marker` file and `RFDR_TEST_EXPORT=1`. Otherwise it creates a disabled runtime. This is a **test-only activation path**, not a general private release path. No change to activation is approved at this stage.
5. `tests/rfdr-n3-15-packaged-encoder.mjs` currently asserts the Resources-root `ffmpeg` layout. `tests/rfdr-n3-17t-electron-packaged.cjs` is an isolated real Electron export harness and is not evidence that `desktop/main.cjs` enables WebM export in the distributed app.
6. The exact-tag FFmpeg/libvpx/opus source-license files exist under `release-audit/licenses/` but actual application/DMG notice placement and corresponding-source access are unverified.

## Recommended isolated integration design (not yet implemented)

- Stage architecture-specific, previously hash-verified runtimes under `Contents/Resources/ffmpeg-runtime/bin/ffmpeg` and `Contents/Resources/ffmpeg-runtime/lib/{libvpx.12.dylib,libopus.0.dylib}` using an explicit electron-builder resource rule. Preserve relative linkage and verify the packaged hashes.
- Update the packaged FFmpeg resolver to this fixed layout, retaining strict realpath containment, no external symlink, executable permission checks and tests. No PATH/Homebrew fallback.
- Introduce an explicitly reviewed release-mode activation mechanism for trusted isolated export, separate from the current test marker and environment variables. Do not silently enable production FFmpeg or weaken IPC validation.
- Include third-party notices and corresponding-source instructions in the actual installer/app; confirm LGPL compliance and distribution obligations before any private sharing.
- Add end-to-end packaged application tests (not only harness tests) for WebM with audio, camera motion, cancellation/retry, plus native ARM64 and Intel acceptance.

## Decision and boundaries

**C1 read-only investigation COMPLETE. C2 integration/build BLOCKED pending explicit authorization for implementation.** Do not claim that existing installers contain the runtime or that production export works. No changes to Working, main, Draft PR #14; no merges, distribution, signing, notarization, or production FFmpeg activation.
