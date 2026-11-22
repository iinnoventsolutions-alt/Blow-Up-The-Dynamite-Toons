# IInnovent Professional Storyboard — Controlled Mac Test Installation Guide (Draft)

**Audience:** Approved testers of unnotarized release-candidate builds, not public distribution.
**Target:** macOS 13 or newer; separate Apple Silicon (arm64) and Intel (x64) installers.
**Status:** Native hardware install and upgrade checks have not yet been completed.

## Before installation

1. Back up every important `.issb` storyboard file to a separate location. Do not test on your only copy.
2. Identify your Mac architecture using Apple menu → About This Mac, or `uname -m` in Terminal (`arm64` or `x86_64`).
3. Obtain the matching DMG only from the authorized GitHub Actions run or approved release-candidate channel.
4. Compare the downloaded DMG SHA-256 hash with the matching value in the build's `SHA256SUMS` manifest, e.g. `shasum -a 256 <file.dmg>`. Do not proceed if it differs.
5. Understand that current CI builds are ad-hoc signed and **not Apple-notarized**. macOS Gatekeeper may block launch. Do not disable system-wide security protections to work around this. Report any warning or block as a test result.

## Installation and first launch

1. Mount the architecture-matched DMG.
2. Copy IInnovent Professional Storyboard into Applications if the DMG provides the app bundle.
3. Launch normally and record any Gatekeeper warning, crash, or permissions prompt. Do not assume a successful CI build guarantees launch.
4. Confirm the application name, icon, version/build display, File menu, and native open/save dialogs.
5. Create a disposable test project, save as `.issb`, quit and reopen it; verify artwork, camera keyframes, onion controls and audio.
6. Exercise recovery only with disposable project data. Record results using the native validation checklist.

## Upgrade and recovery precautions

- Preserve existing projects, user preferences, and recovery data before replacing an earlier test build.
- Test reopening a copy of an older schema-4 project, not the original.
- On a failure, capture macOS version, architecture, build identifier, steps to reproduce, screenshots and relevant crash logs; avoid sharing sensitive project content unnecessarily.
- Do not delete application support or recovery folders as a troubleshooting step without first backing them up.

## Test reporting

Use [Milestone 7 Native Mac Validation](Milestone_7_Mac_Release_Validation.md) to record real Apple Silicon and Intel outcomes. Passing CI jobs alone do not mark those hardware checks complete.

**Distribution gate:** Public installation instructions will be finalized only after Developer ID signing, notarization, and Gatekeeper validation are complete, if public distribution is selected.
