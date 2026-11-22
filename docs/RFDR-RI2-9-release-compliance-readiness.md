# RFDR-RI2.9 — Release Compliance Readiness Review

**Branch:** `RFDR-RI2-Production-Readiness`  
**Scope:** Audit-only decision record. No production enablement, binaries, certificates, release artifacts, or merges.

## Verified technical evidence

| Gate | Evidence | Assessment |
| --- | --- | --- |
| Minimal encoder configuration | FFmpeg n7.1.1, WebM VP8/libvpx + Opus/libopus; policy forbids GPL/nonfree flags; `--disable-xlib` | Technical candidate validated; legal classification not approved |
| Build and smoke | RI2.5 and RI2.6 workflows, ARM64 and Intel | PASS in CI |
| Dependency reduction | RI2.6 run 44634877876: two external libraries, libvpx.12 and libopus.0; X11 dependencies eliminated | PASS for candidate |
| Relocatable runtime | RI2.7 run 44638016876: staged libraries and relative paths | PASS on CI runners |
| Runtime isolation | RI2.8 run 44639880156: copied runtime, recursively checked three Mach-O files, sanitized launch and WebM export | PASS on CI runners; **not** a clean-Mac test |

## Remaining release gates

| Gate | Status | Evidence required before release |
| --- | --- | --- |
| RI2-LIC | **BLOCKED** | Actual FFmpeg configure/license output; license and copyright texts for FFmpeg, libvpx and Opus; source and build provenance, source/offer obligations and notice placement; qualified legal review |
| RI2-DEPS | **PARTIAL** | Independently test staged ARM64 and Intel runtime on clean macOS machines without Homebrew; verify architectures, @loader_path/@executable_path resolution and playback/export |
| RI2-SIGN | **BLOCKED** | Developer ID Application signing of app and nested FFmpeg executable/dylibs; hardened runtime, appropriate entitlements, `codesign --verify` |
| RI2-NOTARY | **BLOCKED** | Notarization submission/acceptance, stapling, Gatekeeper `spctl` checks for final macOS installers |
| RI2-SEC | **PENDING** | Release-specific SBOM, hashes, provenance, vulnerability/malware assessment and clean-machine installer verification |
| RI2-REG | **PENDING** | Production-style ARM64/Intel installer regression: animatic export, FFmpeg export/cancellation/recovery, camera and audio |

## Licensing observations — not legal clearance

The RI2.3 Homebrew FFmpeg builds enabled GPL and additional codecs, and are unsuitable as evidence of compliance for the minimal candidate. The current candidate explicitly excludes GPL/nonfree configuration flags and uses only the necessary WebM codecs, but that alone does **not** establish licensing compliance or satisfy FFmpeg LGPL conditions. Review the exact compiled license output, linkage, modification status, applicable license texts and distribution obligations for each component before release.

## Signing and release configuration

The repository's `package.json` currently sets `build.mac.identity` to `-` (ad-hoc signing). The developer acceptance workflow does not establish Developer ID trust or notarization. Do not configure secrets or activate production packaging as part of this audit.

## Recommended next bounded checkpoint — RI2.10

Perform **license/provenance evidence collection only** for the already validated minimal candidate: record architecture-specific `ffmpeg -L`, `-buildconf`, library versions, source references, SHA-256 and license notices in text-only CI artifacts. Then request qualified legal review. Clean-Mac testing and signing/notarization remain separate gated work.

**Decision:** RI2.9 review complete; **production release NOT APPROVED**. No changes to `Working`, `main`, or Draft PR #14.
