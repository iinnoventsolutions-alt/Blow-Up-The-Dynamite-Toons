# RFDR-RI2.14 — Clean-Mac Runtime Validation Plan

**Status:** TEST PLAN READY; clean-machine acceptance **NOT EXECUTED**.  
**Scope:** ARM64 and Intel macOS, isolated FFmpeg WebM/VP8/Opus runtime only. No production packaging, release distribution, or merge.

## Goal and acceptance boundary

Demonstrate that a staged FFmpeg executable plus its required libvpx and Opus dylibs can launch and export a short WebM video **on macOS hosts without Homebrew or developer-supplied dynamic libraries**. RI2.8 CI relocation is necessary evidence but is not equivalent to a clean-machine test.

## Test prerequisites

- Two independently provisioned macOS environments: native Apple Silicon and native Intel (or clearly document any virtualization and its limitations).
- No Homebrew installation, FFmpeg package, or `/opt/homebrew` / `/usr/local` third-party runtime dependencies on the test host.
- Stage separately built, architecture-specific `bin/ffmpeg`, `lib/libvpx.12.dylib`, and `lib/libopus.0.dylib` in a **private, non-release test bundle**. Record build run, immutable artifact SHA-256 and source provenance. The existing RI2.8 artifacts contain **text evidence only**, so a separate restricted test transfer is required; do not assume the CI artifacts contain binaries.
- Preserve the stage layout `bin/ffmpeg` and `lib/*.dylib`; do not install or copy dependencies into system paths.
- Execute on a disposable host with appropriate internal-test approval. Ad-hoc signatures are not production signing and may not satisfy Gatekeeper when downloaded/quarantined.

## Manual acceptance checklist (repeat independently for ARM64 and Intel)

| ID | Test | Pass criterion |
| --- | --- | --- |
| M1-01 | Record `uname -m`, `sw_vers`, host provisioning, Homebrew absence (`command -v brew`) | Architecture matches target; environment limitations documented |
| M1-02 | Verify SHA-256 of staged executable and both dylibs against build manifest | All hashes match |
| M1-03 | Run `file` and `lipo -archs` on each staged Mach-O file | All binaries match host architecture |
| M1-04 | Inspect `otool -L` on executable and both dylibs | No Homebrew absolute paths; every non-system dependency resolves within stage |
| M1-05 | Inspect `codesign --verify --deep --strict` and `codesign -dv` (record any Gatekeeper/quarantine constraints) | Signatures valid for the **internal test**, not Developer ID approval |
| M1-06 | Launch `env -i PATH=/usr/bin:/bin:/usr/sbin:/sbin ./bin/ffmpeg -hide_banner -version` from staged directory | Exit 0, correct FFmpeg version, no missing dylib errors |
| M1-07 | Run isolated VP8+Opus WebM smoke export using the RI2.8 synthetic RGBA and float32 PCM fixtures | Exit 0, nonempty WebM, expected video/audio streams and duration |
| M1-08 | Relocate entire stage to a second arbitrary directory and repeat M1-04, M1-06 and M1-07 | Identical pass, no absolute build-host dependency |
| M1-09 | Attempt launch without staged libvpx and without staged Opus (one at a time) | Predictable failure confirms staged dependency use; restore files afterward |
| M1-10 | Record runtime diagnostics and full test report | No unreviewed errors; evidence includes OS/arch, hashes, linkage and outputs |

## Evidence to retain privately

For each architecture: OS and architecture metadata; Homebrew absence check; binary and library SHA-256 manifest; `file`, `lipo`, `otool -L` and `codesign` output; sanitized launch log; FFmpeg smoke command and result; `ffprobe` stream details if available **without installing Homebrew**; relocated-stage retest; negative-control observations; reviewer/date and explicit PASS/FAIL/NOT RUN for each test.

Do not upload proprietary binary test bundles or production-distribution packages to public workflow artifacts. Preserve private test evidence in an approved location and link immutable provenance in the acceptance report.

## Exit criteria and blockers

**RI2-DEPS clean-machine PASS** requires all M1-01 through M1-10 to pass on **both** native architectures, with no unexpected non-system dependencies. CI-host success alone is insufficient. If any test fails, capture precise loader error, OS version and linkage and resolve in the isolated branch before retesting.

This test does **not** establish licensing clearance, Developer ID signing, hardened runtime, notarization, malware/SBOM completion, or production installer approval. These remain independent gates.

## Next action

Prepare a private architecture-specific runtime test bundle and the matching checksums, then run the checklist on clean ARM64 and Intel Macs. **Do not mark clean-machine validation complete until the actual host results are recorded.**

**Protected:** `Working`, `main`, and Draft PR #14 remain unchanged. No merge, production activation or public distribution authorized.
