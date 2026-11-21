# RI2.15.5-C3.1 — Licensing and corresponding-source gap matrix

**Checkpoint:** C3.1 documentation-only assessment. **Decision:** REVIEW COMPLETE / DISTRIBUTION NO-GO. No legal clearance is implied.

## Source evidence reviewed

- `docs/RFDR-RI2-15-2-B-binary-license-verification.md`: CI run 44661662574, ARM64 artifact 14594904533 and x64 artifact 14596167258; minimal FFmpeg n7.1.1 configuration and libvpx/opus verified; exact `ffmpeg -L` output missing.
- `release-audit/ri2-4-minimal-ffmpeg-candidate.json`: proposed configuration policy; flags alone do not establish license compliance.
- `scripts/check-ri2-license-inventory.mjs`: verifies four notice files and policy flags; explicitly disclaims distribution approval.
- `docs/RFDR-RI2-15-5-C3-production-readiness-review.md`: signed unpacked app verification and native acceptance complete; release blocked.
- C2.4-D3 and C2.5 acceptance records: both architectures' packaged notices and runtime verified; no production distribution authorization.

## Evidence and gaps

| Item | Verified evidence | Outstanding requirement | Suggested owner | Gate |
|---|---|---|---|---|
| FFmpeg binary license classification | FFmpeg n7.1.1, minimal flags, GPL/version3/nonfree absent in both CI configurations | Capture **exact** `ffmpeg -L` from approved staged binaries on both architectures; retain complete output and correlate to B3 hashes | Build/release engineering | OPEN |
| libvpx 1.16.0 provenance | Linked dylibs and notice files present; expected version recorded | Identify exact source origin, source archive/tag and checksums for both architectures; verify actual dylib license and modification status | Build engineering | OPEN |
| libopus 1.6.1 provenance | Linked dylibs and notice files present; expected version recorded | Same source provenance, checksums and modification status for both architectures | Build engineering | OPEN |
| FFmpeg corresponding source | Source version and build configuration recorded | Confirm exact source tree/patches, configure/build scripts, linked library source and any changes required to reproduce supplied binaries; determine license-specific delivery requirements | Build engineering + legal | OPEN |
| Copyright and license notices | Four notice files included in signed unpacked apps, matching repo inventory | Confirm full applicable attribution and license text coverage, in-app accessibility and distribution-package presentation | Release engineering + legal | OPEN |
| LGPL linking/relinking obligations | FFmpeg and codec dylibs packaged with relative references | Review recipient ability to replace/relink libraries, reverse-engineering-for-debugging restrictions, and any applicable installation-information requirements | Legal + engineering | OPEN |
| Source distribution mechanism | Internal repository evidence exists | Choose and validate recipient-facing corresponding-source offer/download/access, retention and version matching before distribution | Release/legal | OPEN |
| Final distribution approval | Internal test acceptance only | Legal/compliance sign-off, intended audience/channel, Developer ID/notarization policy, release owner approval | Release owner + legal | BLOCKED |

## Narrow evidence collection proposal (not executed)

For each original staged runtime, run `bin/ffmpeg -hide_banner -L`, save complete stdout/stderr alongside the exact B3 SHA-256 and architecture, and cross-check the text against bundled notices. Do not infer legal classification solely from flags. Then inventory source archives, patches and build instructions by component and architecture. Any distribution plan requires an explicit separate decision.

## Non-goals and restrictions

No binary rebuild or modification, no license conclusions beyond observed evidence, no production FFmpeg activation, no installer/DMG publication, no merge, and no changes to Working, main or Draft PR #14. C3.1 closes the *gap identification* checkpoint only, not any compliance gate.
