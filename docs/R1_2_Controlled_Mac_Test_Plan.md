# R1.2 — Controlled Native Mac Test Execution

**Distribution decision:** Controlled testing first. No public distribution or GitHub Release authorized.
**Source branch:** `Working`. **Release and main:** unchanged.
**Current version:** 1.0.0; build 10152026.1310. Do not silently change these for test builds.
**Supported target under test:** macOS 13+; Apple Silicon arm64 and Intel x64.

## Entry gate

- [ ] Latest `Working` Electron Builder Security Trial completed successfully.
- [ ] Record exact CI run URL, commit SHA, artifact names, SHA256SUMS manifest, and build trust status.
- [ ] Download artifacts only from the validated run; verify SHA-256 before mounting.
- [ ] Back up original `.issb` projects and existing app support/recovery data. Use disposable project copies.
- [ ] Record macOS version and hardware architecture.

## M1 primary test pass

- [ ] Mount matching arm64 DMG, copy app to Applications, record normal first-launch behavior and any Gatekeeper warnings. Do not disable system-wide protections.
- [ ] Verify app icon, About/version, menus, native open/save, close Save/Discard/Cancel, quit/relaunch.
- [ ] Create/save/reopen a disposable `.issb` project and reopen an older schema-4 project copy.
- [ ] Verify camera frame, keyframe add/move, interpolation, copy/paste/reset, mask, playback and export.
- [ ] Verify independent backward/forward onion-skin settings up to five frames, scene boundaries and save/reopen.
- [ ] Verify brush, pencil, eraser, fill, layers, undo/redo, zoom, image imports, and input latency.
- [ ] Verify audio import/playback, timeline synchronization, PDF export, and offline Help Center.
- [ ] Test autosave/recovery with disposable data, then verify original projects remain unchanged.
- [ ] Record any crash, regression, performance degradation, or install failure.

## Intel follow-up

- [ ] Repeat installation and key workflow tests using x64 DMG on **actual Intel Mac** with macOS 13+.
- [ ] Record architecture, OS version, results and logs. Cross-architecture packaging alone is not a hardware pass.

## Result log

| Date | CI run/commit | Mac/OS | Architecture | Test | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| TBD | TBD | M1 / Sequoia 15.7.7 | arm64 | Install and launch | Not run | Awaiting hardware |
| TBD | TBD | Intel / macOS 13+ | x64 | Install and launch | Not run | Awaiting hardware |

## Exit criteria

- Both architecture test reports completed, or Intel gap explicitly documented and approved for the selected limited audience.
- No unresolved release-blocking functional/security defects.
- Installer hashes, artifacts, issues, and workarounds recorded.
- Release candidate promotion to `Release` requires a separate explicit decision.
- Developer ID signing/notarization remain required for later unrestricted public distribution.
