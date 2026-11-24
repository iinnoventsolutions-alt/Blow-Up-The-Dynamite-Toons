# RFDR-RI2.13 — Licensing Compliance Handoff

**Project:** IInnovent Professional Storyboard  
**Branch:** `RFDR-RI2-Production-Readiness`  
**Decision:** Technical evidence package assembled for qualified legal review; **no redistribution approval**.

## Reviewed CI evidence

| Checkpoint | Run | Verified scope |
| --- | --- | --- |
| RI2.8 | [44639880156](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/44639880156) | ARM64/Intel relocatable runtime, dependency-path checks, sanitized launch and WebM smoke test on CI runners; **not clean Macs** |
| RI2.10 | [44647305509](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/44647305509) | ARM64/Intel FFmpeg license/build output, component formula metadata, checksums, available LGPL texts |
| RI2.11 | [44654736601](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/44654736601) | Review of RI2.10 artifacts: GPL/nonfree configure flags not observed, libvpx and Opus formula license metadata BSD-3-Clause |
| RI2.12 | [44655555409](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/44655555409) | Upstream default-branch libvpx/Opus license reference copies and review report collected; **not exact-version verified** |

**FFmpeg:** Candidate source tag `n7.1.1`; minimal WebM/VP8/Opus configuration; RI2.10 captured `-L`, `-buildconf`, `-version`, FFmpeg source commit, and available LGPL v2.1/v3 text. The exact applicable FFmpeg license conditions and compliance duties require review, including the linkage/relinking arrangement.

**Codec versions reported by RI2.11:** ARM64 libvpx 1.17.0 and Opus 1.6.1; Intel libvpx 1.16.0 and Opus 1.6.1. Homebrew formula metadata reports BSD-3-Clause for both. Metadata alone does not verify all copyright notices, patches, binary build provenance, or actual release obligations.

## Questions requiring qualified legal review

1. Determine applicable FFmpeg licensing terms from the **exact built candidate** and its linked libraries, including LGPL source availability, modification notices, relinking/replacement requirements, reverse-engineering allowances and notice placement.
2. Verify the exact-version libvpx and Opus upstream license and copyright texts against the architecture-specific binaries, including any Homebrew patches or modifications. RI2.12 downloaded **default-branch** reference copies, not version-pinned source archives.
3. Confirm whether the proposed installer can satisfy all component notice, attribution, source/build-script and license delivery obligations; approve the actual notices/source-delivery plan.
4. Review the full component dependency list, build provenance, SHA-256 manifests, SBOM, and release package contents before any external distribution.

## Evidence package index

- RI2.10 ARM64 artifact: `RFDR-RI2-10-arm64-44647305509`
- RI2.10 Intel artifact: `RFDR-RI2-10-x64-44647305509`
- RI2.11 review artifact: `RFDR-RI2-11-review-44654736601`
- RI2.12 upstream notices and report: `RFDR-RI2-12-review-44655555409`

**Retention caution:** GitHub Actions evidence artifacts were configured for **14 days**. Archive approved review materials in a controlled, durable location before expiration; this handoff is an index, not a copy of the underlying evidence.

## Release readiness and decision gates

| Gate | Current assessment |
| --- | --- |
| Licensing | **BLOCKED** — legal determination, exact-version notices/source provenance and distribution plan missing |
| Dependency relocation | **CI PASS; clean-machine independence NOT VERIFIED** |
| Developer ID signing and hardened runtime | **NOT VERIFIED**; `package.json` currently uses ad-hoc mac identity `-` |
| Apple notarization/stapling/Gatekeeper | **NOT VERIFIED** |
| SBOM, release checksums, malware assessment | **PENDING** for production package |
| ARM64/Intel production-style regression | **PENDING** |

## Recommended next bounded technical checkpoint

**RI2.14 — Clean-Mac runtime validation plan.** Prepare a non-distributing, auditable acceptance checklist and evidence requirements for ARM64/Intel macOS machines without Homebrew; do not claim clean-machine PASS until actual testing. Keep signing, notarization, production packaging and release authorization separate.

**Restrictions:** Do not change `Working`, `main`, Draft PR #14, production FFmpeg activation, signing secrets or distribution policy. This document is an evidence handoff, **not legal advice or approval**.
