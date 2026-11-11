# RFDR N1.7 — FFmpeg Packaging and Licensing Readiness Decision

**Decision: technical ARM64 packaging feasibility PASS; public distribution and production integration NOT APPROVED.**
Reviewed: 2026-11-11. Branch: `RFDR-A1.5-D4.6.5-WebM-Muxing-Prototype`. No changes authorized to `Working`, `main`, Draft PR #14, or production export code.

## Evidence matrix

| Gate | Evidence | Finding |
| --- | --- | --- |
| N1.3 VP8/Opus six-second export | [Run 42980471791](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/42980471791) | PASS: 144 frames, 288000 decoded audio samples; audio-containing WebM metadata duration reports 6.008s, not exactly 6.000s |
| N1.4 installed-FFmpeg audit | [Run 42980471835](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/42980471835) | PASS audit; installed Homebrew FFmpeg is GPL-configured and is **not** approved for redistribution |
| N1.5 custom build | [Run 42980472054](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/42980472054) | PASS: FFmpeg 8.0.1 ARM64 configured with GPL/nonfree/version3 disabled and VP8/Opus enabled |
| N1.6.1 isolated Electron package | [Run 42980471784](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/42980471784) | PASS: ARM64 app packaged; FFmpeg and bundled libvpx/libopus launch, codec and architecture checks pass; ad-hoc signatures verify; no Homebrew dynamic-library references in inspected binaries |
| Mediabunny alternative | [Run 42980471716](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/42980471716), [N1.2 decision](rfdr-a1-5-n1-2-opus-padding-decision.md) | NO-GO: known decoded Opus end-padding discrepancy |

## Licensing and supply-chain release blockers

1. **FFmpeg license determination.** The flags `--disable-gpl --disable-nonfree --disable-version3` support an LGPL-oriented configuration, but do not independently establish the license status of the complete distributed build. Archive exact FFmpeg source revision, configuration, dependency inventory, build scripts and checksums; have qualified release/legal review confirm applicable FFmpeg LGPL version, component licensing, and patent considerations.
2. **Bundled codec licenses.** Record the exact libvpx and libopus versions, source origins, licenses, attribution/notice requirements and redistribution permissions. Preserve applicable copyright and license texts in the release.
3. **LGPL compliance plan.** Determine applicable source availability, notices, modifications, reverse-engineering/relinking rights and the chosen dynamic-linking strategy; verify the application distribution method does not prevent permitted library replacement. The current proof uses dynamically linked codec libraries, but that alone does not satisfy all obligations for FFmpeg and its components.
4. **Code signing/notarization.** N1.6.1 validates ad-hoc signature integrity, not Developer ID signing, hardened runtime, notarization, Gatekeeper acceptance or a shipped DMG.
5. **Binary provenance/security.** Pin sources and hashes, produce an SBOM and dependency/vulnerability review, check nested library dependencies, verify malware/security scans and reproducible release steps.
6. **Intel macOS.** No x64 build, bundled x64 library closure, installer, or manual Intel compatibility acceptance has been demonstrated.
7. **Production integration.** No application export invocation, offline audio timeline mixing, cancellation, error handling, camera/transition parity, audible A/V synchronization, or real M1 installer acceptance has been demonstrated. The N1.3 audio WebM container duration of 6.008s still needs an explicit acceptance decision if exact 6.000s metadata is required.

## Scope and limitations of N1.6.1

The isolated workflow creates an unpacked ARM64 Electron `.app` with a bundled FFmpeg executable and codec dylibs. It tests executable startup, available encoders, library references, architecture and signature integrity. It does **not** exercise actual storyboard export through that bundled executable, create a notarized production installer, or establish distribution license clearance. N1.4's Homebrew/GPL audit remains valid for the **Homebrew** binary; N1.5/N1.6 use a separate non-GPL-configured custom build.

## Short next checkpoint — N1.8 (proposed, requires approval)

Run a **packaged binary encoding proof** using the N1.6.1 app resource and N1.3 six-second fixture, checking 144 video frames, exactly 288000 decoded audio samples, seek/playback and the observed 6.008s container-duration caveat. Capture library closure and binary/source provenance. Do not modify the production export implementation or claim licensing clearance.

After that, prepare a distribution compliance checklist for legal/release review and separately authorize production integration. Avoid merging until the user explicitly approves.

**Final N1.7 decision:** ARM64 isolated packaging FEASIBLE; **distribution NO-GO**, **production integration NO-GO** pending the blockers above.
