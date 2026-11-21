# RI2.15.5-C3.3 — Homebrew metadata assessment

**Status: OPEN — current-machine metadata reviewed, approved-runtime source provenance still incomplete.**

## User-provided evidence (2026-11-21)

Command: `brew list --versions ffmpeg libvpx opus` and `brew info --json=v2 ffmpeg libvpx opus`.

| Component | Approved staged runtime | Currently installed Homebrew | Implication |
|---|---|---|---|
| FFmpeg | n7.1.1 | 9.0.2_1 | Current metadata does not prove historical FFmpeg source |
| libvpx | 1.16.0 | 1.17.0 | Current metadata does not prove historical libvpx source |
| opus | 1.6.1 | 1.6.1 | Version agrees, but identical source/binary provenance not established |

Current Homebrew metadata: ffmpeg 9.0.2 tarball sha256 `8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e`, formula GPL-3.0-or-later; libvpx 1.17.0 source sha256 `1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a`, BSD-3-Clause; opus 1.6.1 source sha256 `6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1`, BSD-3-Clause. The Homebrew FFmpeg formula's GPL-3.0-or-later classification refers to current generic Homebrew FFmpeg, **not** the approved custom minimal n7.1.1 binary, whose own `-L` output was LGPL v2.1+.

No patches are listed in *current* Homebrew formula metadata; this does not prove historical formulas or builds were unpatched. The user-supplied Homebrew metadata includes current ARM64 Sequoia bottles and does not establish Intel historical provenance.

## Next narrow evidence request

Prefer read-only inspection of GitHub Actions run `44661662574` build workflow/logs and its artifacts `14594904533` (ARM64), `14596167258` (x64). Collect exact n7.1.1 source URL/archive SHA, libvpx 1.16.0 source URL/archive SHA, Opus 1.6.1 source URL/archive SHA, formula revisions/patches, build scripts/configuration and toolchain details. Do not install/downgrade/upgrade any packages or rebuild binaries. C3.2 approved hashes and licensing evidence remain valid.

## Boundary

C3.3 remains OPEN. No application changes, Working/main/PR#14 changes, production export activation, or distribution.
