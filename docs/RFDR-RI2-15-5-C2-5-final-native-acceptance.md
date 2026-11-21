# RI2.15.5-C2.5 — Final native application acceptance

**Status: CLOSED — ARM64 and native Intel x64 PASS (user-reported).**

## Evidence

- ARM64: ten manual checks passed after clarification of M1-08; details recorded in `docs/RFDR-RI2-15-5-C2-5-ARM64-manual-acceptance.md`.
- Intel x64: user confirmed “Intel tests have passed” following the same ten-item native acceptance checklist and clarified M1-08R criterion. No itemized Intel output was supplied in this confirmation; record as user-reported PASS, not independently audited logs.

## Scope

Native signed-unpacked application launch, project create/open/edit/save/reopen, camera IN/OUT and intermediate keyframes, camera playback and transitions, audio synchronization, existing Timeline Export Animatic, restricted FFmpeg-specific option not exposed, and app relaunch.

C2.4-D3 verified both packaged runtimes' B3 staging integrity, post-signing code signatures, architecture, library dependencies, notices, and executable version. C2.5 verifies application-level workflows, not production FFmpeg export activation.

## Remaining release gates

- Review licensing obligations, corresponding-source availability, and distribution notices.
- Review production FFmpeg export activation and test/production boundaries before any change.
- Define code signing/notarization/distribution approach and release approval separately.

No merge or change to Working, main, or Draft PR #14. No release/distribution or production export authorization.
