# IInnovent Professional Storyboard — R1 Release Notes (Draft)

**Status:** Draft for controlled release-candidate testing; not a public release announcement.
**Current package version:** 1.0.0. **Current build:** 10152026.1310.
**Platforms targeted:** macOS 13+ on Apple Silicon (arm64) and Intel (x64); hardware compatibility validation remains pending.

## Highlights

- Camera keyframe editing, interpolation, panel-level camera copy/paste/reset, and camera-aware playback.
- Expanded onion-skin controls with independently adjustable backward and forward visibility, up to five frames in each direction.
- Built-in offline Help Center for common application workflows.
- Drawing, layer, panel, audio, timeline, and PDF export workflows retained from the existing storyboard application.
- R1.0 security review, additional hostile project-import regression tests, and successful automated Electron packaging and malware-scan checks.

## Important limitations

- Available CI installers are **ad-hoc signed and not notarized**; they are for controlled testing, not unrestricted public distribution.
- Automated CI packaging does not establish successful installation or use on physical Intel and Apple Silicon Macs.
- Back up important `.issb` projects before installing or testing a release candidate.
- Actual version/build identifiers, download links, checksums and hardware test results must be updated when the candidate is frozen.

## Release readiness

This document is a working draft. Public release requires completion of native compatibility checks and the approved distribution security path. No GitHub Release or `main` promotion is authorized by this draft.
