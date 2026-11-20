# RI2.15.5-C — Private Installer Acceptance (preflight)

**Status: OPEN — package evidence not yet available.** Approved audience: development team and individually invited testers. Developer ID signing/notarization conditionally deferred; no public distribution. This checkpoint does **not** authorize release.

## Packaging blocker identified in current repository configuration

`package.json` currently specifies `build.files` as `dist/**/*`, `desktop/**/*`, `src/project-format.js`, `package.json`, and `src/build-info.json`. The already-validated FFmpeg runtime `bin/ffmpeg`, `lib/libvpx.12.dylib`, and `lib/libopus.0.dylib` are **not explicitly included**. Do not assume the existing `npm run package:mac` output contains the FFmpeg runtime or required third-party notices. First determine the app's actual FFmpeg path-resolution mechanism, intended `extraResources` placement, and architecture-specific packaging strategy; implement only in an isolated follow-up after explicit scope approval.

## C1 — Read-only packaging and runtime integration review

- [ ] Identify exact Electron process that invokes FFmpeg and how its executable path is resolved in packaged vs development modes.
- [ ] Identify where architecture-matched FFmpeg and dylibs will be placed in `.app/Contents/Resources` (or another validated location), preserving their relative linkage.
- [ ] Verify final packaged FFmpeg and dylib hashes against RI2.15.5-B3 approved per-architecture checksums.
- [ ] Determine where FFmpeg/libvpx/opus license notices and corresponding-source instructions appear in the installed app, not just in the Git repository.
- [ ] Check that package configuration does not accidentally include development keys, encrypted test archives, or unapproved external dependencies.

## C2 — Controlled private test installer

- [ ] Build ARM64 and x64 DMGs from a pinned isolated commit with reproducible version/build identifiers.
- [ ] Record hashes of DMGs, installed app executables, and nested runtime files; inspect nested signatures.
- [ ] Inspect `.app` and DMG contents, including file permissions, symlinks, license notices, app entitlements, executable permissions, and all external runtime dependencies.
- [ ] Run relevant unit/UI, Electron IPC/security, and export regression suites; archive results.

## C3 — Manual acceptance (each architecture, on authorized clean native Macs)

| ID | Test | Expected |
| --- | --- | --- |
| M1-01 | Host/OS and installer SHA-256 | Correct native architecture; matches recorded installer |
| M1-02 | Mount DMG, copy app to Applications | No missing files or unexpected privileged installer steps |
| M1-03 | First launch and Gatekeeper behavior | Trusted tester can use macOS-supported per-app exception if necessary; no global security disablement |
| M1-04 | Open/create/save/reopen ISSB project | No data loss; correct project associations |
| M1-05 | Drawing, timeline, camera, audio smoke tests | Previously accepted functions remain operational |
| M1-06 | WebM export with audio and camera motion | Complete export with expected duration and playable output |
| M1-07 | Cancel export and retry | No exception or stuck process; subsequent export works |
| M1-08 | Verify bundled runtime/notice/source instructions | Correct binaries, expected hashes, accessible notices |
| M1-09 | Quit, relaunch, reinstall, remove app | No corruption or unexpected deletion of user projects |
| M1-10 | Capture logs and report | PASS/FAIL and evidence for each architecture |

## Decision

**RI2.15.5-C not ready for execution until packaging-path review is complete.** The previously validated FFmpeg runtimes alone do not demonstrate an integrated installer. No changes to `Working`, `main`, or Draft PR #14; no production FFmpeg activation, merge, or distribution.
