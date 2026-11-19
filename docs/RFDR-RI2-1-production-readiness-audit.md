# RFDR-RI2.1 — Production Release Readiness Audit (Initial)

**Baseline:** Working merge commit `acaaaae43f90bbebfd8a444026ef1569730dfbe1`  
**Audit branch:** `RFDR-RI2-Production-Readiness`  
**Scope:** Evidence-based, audit-only; no production activation, installer publication, or merge.

## Current verified facts

1. **Developer-only isolation — PASS.** Standard RI1.5-C macOS packaging excludes `Contents/Resources/ffmpeg` and `rfdr-test-export.marker`. The Electron main-process activation requires `RFDR_ENABLE_PRODUCTION_EXPORT=1`, and packaged applications additionally require the marker and `RFDR_TEST_EXPORT=1`.
2. **Developer acceptance — PASS.** ARM64 and Intel x64 developer installers passed manual testing; the isolated runtime and post-merge regression workflows passed on the RI1 integration.
3. **Encoder acquisition — DISTRIBUTION BLOCKER.** The RI1.5-D developer workflow runs `brew install ffmpeg` and copies the resolved executable into the app resources. This does not establish a reproducible, redistributable FFmpeg build or include a documented dependency closure.
4. **Codec selection — REVIEW REQUIRED.** `desktop/isolated-ffmpeg-sink.cjs` requests `libvpx` for WebM video and `libopus` when audio is present. The actual FFmpeg configure flags, linked libraries, and corresponding license obligations have not been collected.
5. **Signing/notarization — DISTRIBUTION BLOCKER.** `package.json` sets `build.mac.identity` to `-`; the developer workflow sets `CSC_IDENTITY_AUTO_DISCOVERY=false` and explicitly records ad-hoc signing and no notarization.
6. **Security regression — PASS FOR TEST SCOPE.** The existing Electron Builder Security Trial validates dependency audit, browser regression, architecture, ad-hoc signature, DMG checksums and independent Linux malware scan. These checks do not establish Developer ID trust, Apple notarization, or FFmpeg redistributability.
7. **Versioning/release provenance — REVIEW REQUIRED.** `package.json` currently identifies app version `1.0.0`. Release provenance should identify immutable encoder artifacts, checksums, license notices, and signed/notarized installer identity.

## Required evidence and acceptance gates

| Gate | Required evidence | Initial status |
| --- | --- | --- |
| RI2-LIC | FFmpeg `-version`, `-buildconf`, `-encoders`, codec list; license classification, source/build provenance, notices and any source/offer obligations | BLOCKED: not yet collected |
| RI2-DEPS | `otool -L` and `otool -l` for encoder and recursively required dylibs on arm64 and x64; standalone clean-Mac runtime test | BLOCKED: not yet collected |
| RI2-SIGN | Apple Developer ID Application signing plan for nested executables/dylibs, hardened runtime, entitlements, `codesign --verify` | BLOCKED: not configured |
| RI2-NOTARY | `notarytool` submission and acceptance, stapling, `spctl` verification for both installer architectures | BLOCKED: not configured |
| RI2-SEC | Release-specific dependency/SBOM, provenance/checksum, malware scanning and clean-machine installer tests | PENDING |
| RI2-REG | Standard animatic export preservation, FFmpeg export/cancel/recovery, camera/audio, ARM64/x64 regression with production-style package | PENDING |

## Proposed remediation order

1. Capture architecture-specific FFmpeg build configuration, dynamic library graph, and licenses **without copying binaries into a production release**.
2. Decide on a reproducible, compliant FFmpeg distribution approach (and confirm obligations with qualified legal review).
3. Build and verify self-contained architecture-specific encoder resources in isolated CI; add dependency closure and checksum gates.
4. Configure Developer ID signing, hardened runtime and notarization in a dedicated, permission-limited release workflow.
5. Validate on clean ARM64 and Intel macOS systems; verify security, functional parity and reproducible provenance.
6. Present release approval package for explicit authorization. **Do not enable or distribute production FFmpeg before all gates pass.**

## Protection constraints

- No changes to `Working`, `main`, or Draft PR #14.
- No merge, public release, production FFmpeg enablement, signing secret upload, or certificate changes under RI2.1.
- Developer-only FFmpeg activation and existing animatic export must remain unchanged.
