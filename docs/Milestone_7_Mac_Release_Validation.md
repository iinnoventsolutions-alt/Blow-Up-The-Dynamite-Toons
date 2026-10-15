# Milestone 7 — Native Mac release validation

Status: IN PROGRESS — test plan only; no hardware results claimed.
Baseline: Version 1, Build 10152026.1310 (Working).
Target: macOS 13 Ventura or newer, Apple Silicon arm64 and Intel x64.
Primary test machine: Apple M1, macOS Sequoia 15.7.7.
Keep `main` unchanged until explicit promotion approval.

## Preflight on primary M1
- [ ] Record `sw_vers`, `uname -m`, `node -v`, `npm -v` and free disk space.
- [ ] Clone/download **Working**; preserve existing .issb files before testing.
- [ ] Run `npm ci`, `npm test`, `npm run build`, `npm run test:ui`; record logs and failures.
- [ ] Run `npm run desktop`; confirm actual Electron launch (not browser preview).

## Native workflows
- [ ] New/Open/Save/Save As with native dialogs; close Save/Discard/Cancel; recovery after restart.
- [ ] Open an existing schema-4 .issb; verify embedded artwork and audio, and .issb file association.
- [ ] Drawing: Vector/Bitmap, onion guides, icons, Undo, zoom, imported images; verify tablet pressure separately.
- [ ] Panel moves, camera interpolation, transitions, and playback across Drawing/Timeline/Pitch.
- [ ] Multiple audio tracks: import, trim, seek, mute/solo, synchronization and long-session playback.
- [ ] Pitch native fullscreen entry/exit and window restore.
- [ ] PDF profiles/branding, PDF save/open; PNG and WebM animatic export.
- [ ] Repeat Save/reopen and simulate recovery without modifying the only copy of a project.

## Packaging
- [ ] Confirm `public/innovent-icon.icns` exists and is packaged correctly.
- [ ] Run `npm run package:mac` on macOS; inspect both arm64 and x64 DMG artifacts.
- [ ] Inspect architecture with `file` or `lipo -info` on packaged Electron binaries.
- [ ] Mount and install ARM64 DMG on the M1; launch and quit offline; check app menus, icon and associations.
- [ ] Test Intel DMG on actual Intel hardware with macOS 13+; building x64 on M1 is not equivalent to testing.
- [ ] Test minimum OS on macOS 13 hardware/VM and record exact environment.
- [ ] Decide Developer ID signing/notarization and Gatekeeper distribution; unsigned builds are not a public release.
- [ ] Confirm clean installation and upgrade without losing preferences, recovery or projects.

## Performance and release gate
- [ ] Large project (panels/layers/embedded audio), repeated save, memory/CPU, long playback, PDF/WebM exports.
- [ ] Record crash logs, steps to reproduce, expected/actual behavior and affected architecture.
- [ ] Prepare installation guide, known limits, backup/recovery notes, release notes.
- [ ] User accepts Milestone 6 review and all Milestone 7 blockers; only then consider `main` promotion.

## Result log
| Date | Machine / macOS | Architecture | Test | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| TBD | M1 / Sequoia 15.7.7 | arm64 | Native launch | Not run | Awaiting local hardware run |
| TBD | Intel / macOS 13+ | x64 | Native launch | Not run | Intel hardware needed |

Notes: Electron 44 and electron-builder 26 are specified in package.json. The existing packaging script requests separate DMGs for both architectures. This document records a plan, not an installer or verified compatibility result.
