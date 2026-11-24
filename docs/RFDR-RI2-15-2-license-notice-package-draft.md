# RI2.15.2 — Third-party license and source-notice package (DRAFT)

Status: **documentation-only; NOT approved for redistribution**. Prepared from GitHub Actions run 44661662574 (source commit fee3226355ffe13863066c35c2eabc962e229e37), its x64 job log, and release-audit/ri2-4-minimal-ffmpeg-candidate.json. This document is an evidence index and release checklist, **not** a substitute for verbatim upstream license texts or legal review.

## Component inventory (internal test runtime)

| Component | Version / provenance | License evidence needed | Current disposition |
| --- | --- | --- | --- |
| FFmpeg | upstream tag n7.1.1; commit db69d06eeeab4f46da15030a80d539efb4503ca8 | Exact tag COPYING.LGPLv2.1, COPYING.LGPLv3 if applicable, LICENSE.md, relevant component notices, actual buildconf and binary license output | OPEN |
| libvpx | Homebrew libvpx 1.16.0 (x64 CI log), staged libvpx.12.dylib | Exact source-release LICENSE, copyright, bottle/source provenance and checksum | OPEN |
| libopus | Homebrew opus 1.6.1 (x64 CI log), staged libopus.0.dylib | Exact source-release COPYING/license, copyright, bottle/source provenance and checksum | OPEN |

Sources: https://github.com/FFmpeg/FFmpeg/tree/n7.1.1 ; https://chromium.googlesource.com/webm/libvpx/ ; https://github.com/xiph/opus ; https://ffmpeg.org/legal.html . Source links are references only; do not assume latest HEAD license text matches the shipped versions.

## Verified configuration evidence

CI used `./configure --disable-doc` plus `requiredConfigureFlags` in `release-audit/ri2-4-minimal-ffmpeg-candidate.json`. Candidate uses `--disable-everything`, `--enable-libvpx`, `--enable-libopus`, VP8 and Opus encoders, WebM muxer, and file/pipe protocols. Candidate forbids `--enable-gpl`, `--enable-version3`, `--enable-nonfree` and selected restricted integrations. CI confirmed VP8/Opus encoder listings and successful smoke tests.

**Important:** Candidate policy and successful build are not a final license determination. Collect the exact staged executable's `ffmpeg -L`, `ffmpeg -buildconf`, `ffmpeg -version`, linked-library inventory, and corresponding ARM64 evidence before deciding LGPL/GPL status. FFmpeg licensing can vary with build options and included code.

## Required before a production distribution decision

- [ ] Preserve verbatim license and copyright files from the **exact** FFmpeg n7.1.1, libvpx 1.16.0, and opus 1.6.1 sources; record upstream URLs, commit/tag identities and hashes.
- [ ] Capture both architecture binaries' `-L`, `-buildconf`, `-version`, and `otool -L` output; compare to candidate and investigate any unexpected libraries or flags.
- [ ] Determine whether FFmpeg executable is LGPL-only, GPL, version-3, or nonfree under its **actual** build; have distribution obligations reviewed.
- [ ] Prepare corresponding source for FFmpeg and any modified portions, exact build scripts/flags, and required installation/relinking information if applicable; assess static versus dynamic linking and LGPL reverse-engineering/relinking requirements.
- [ ] Include exact third-party copyright and license notices in the shipped app's accessible notices bundle and documentation; include source offer or source-access instructions as required.
- [ ] Verify libvpx/opus source/bottle provenance and license obligations for each shipped architecture; retain hashes and SBOM entries.
- [ ] Run an automated release-package check that fails on missing notices, missing source references, unexpected binary versions/configuration, or unapproved build flags.
- [ ] Complete independent legal/compliance review, Developer ID signing, hardened runtime, notarization/stapling, Gatekeeper, SBOM/checksums, and production installer testing.

## Release guardrail

This draft does **not** authorize packaging or public distribution of FFmpeg or its dependent dylibs. No production FFmpeg distribution activation, branch merge, PR #14 modification, signing, notarization, or release. Protected branches: Working and main.

## Evidence and CI verification

GitHub Actions run https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/44661662574 has two completed successful jobs: encrypted test bundle (arm64), encrypted test bundle (x64). Both jobs completed build, WebM smoke, dependency closure, relocation, encryption, and evidence upload steps. Four artifacts were listed (two encrypted test bundles and two evidence archives). The artifacts have expiration dates; archive the **text evidence** securely before expiry. No claim is made here that the evidence ZIP contents were inspected.
