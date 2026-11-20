# RFDR-RI2.14.4 — Manual Acceptance Record and Clean-Mac Gate

**Status:** Development-Mac ARM64 and Rosetta Intel acceptance **CLOSED** based on user-reported results; native clean-machine validation **OPEN**.

**Provenance:** User-reported manual Terminal results from the RI2.14.2 and RI2.14.3 acceptance sessions. This document records reports; it does not claim independent machine-log verification. Build source: [RI2.14.1 GitHub Actions run 44661662574](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/44661662574), commit `fee32263`; ARM64 and x64 encrypted artifacts built successfully.

## Completed: ARM64 development Mac (2021 M1 MacBook Pro)

| Test | User-reported outcome |
| --- | --- |
| M1-01 Host/environment | PASS |
| M1-02 SHA-256 verification | PASS |
| M1-03 Architecture | PASS, after correcting `lipo -archs` to inspect one file at a time |
| M1-04 Dependency paths | PASS |
| M1-05 Code signatures | PASS |
| M1-06 Sanitized runtime launch | PASS |
| M1-07 VP8/Opus WebM export | PASS, using raw RGBA/f32le input after `lavfi` proved unavailable in minimal FFmpeg build |
| M1-08 Relocated runtime launch and WebM export | PASS |
| M1-09 Missing libvpx and Opus, then restore and recover | PASS; expected dyld missing-library error observed for libvpx |
| M1-10 Results reviewed | PASS |

**Scope limitation:** Homebrew exists on this development Mac. Passing does not prove clean-host independence.

## Completed: x64 Intel binary under Rosetta 2 on Apple Silicon

| Test | User-reported outcome |
| --- | --- |
| M1-01 x86_64 executable and dylib architecture | PASS |
| M1-02 Rosetta launch | PASS |
| M1-03 Dependency paths | PASS |
| M1-04 Synthetic test media generation | PASS |
| M1-05 VP8/Opus WebM export | PASS |
| M1-06 Runtime relocation | PASS |

**Observations:** None reported. **Scope limitation:** Rosetta on ARM64 is not native Intel macOS testing.

## RI2.14.4 clean-host acceptance requirements

**Goal:** Establish real dependency independence for both architectures using separately provisioned macOS hosts without Homebrew or other third-party library installations. A native Intel Mac and a native ARM64 Mac are preferred. If virtualized, record host/guest architecture and limitations; do not present translated x64 execution as native Intel.

### Before test

1. Confirm private test authorization and machine ownership/access. Do not distribute test bundles publicly; retain the age private identity key only on an authorized local machine.
2. Record `uname -m`, `sw_vers`, `command -v brew`, `ls -ld /opt/homebrew /usr/local/Homebrew /usr/local/Cellar` and any other preinstalled FFmpeg libraries. The absence of `brew` on PATH alone is not sufficient evidence of a clean host.
3. Transfer the architecture-matched encrypted artifact privately; decrypt with `age -d -i ~/.config/age/keys.txt -o runtime.tar.gz <bundle>.age` on an authorized host, and extract `bin/` and `lib/` into an arbitrary test directory. Do not install libraries system-wide.
4. Compare the staged files against `ri2-14-1-runtime-sha256.txt` from the corresponding architecture evidence artifact; preserve the run URL, artifact name and hashes.

### Native clean-host checklist (each architecture)

| ID | Requirement | Pass criterion |
| --- | --- | --- |
| C1 | Host and third-party dependency inventory | Correct native architecture; no Homebrew or substitute third-party runtime dependency; evidence captured |
| C2 | Hashes, file types and `lipo -archs` per binary | All three hashes match; executable and dylibs match native architecture |
| C3 | `otool -L` for FFmpeg and both dylibs | No absolute Homebrew dependencies; only stage-relative or macOS system dependencies |
| C4 | `codesign --verify --verbose=2` for all three files | Internal-test signatures verify; record Gatekeeper/quarantine behavior separately |
| C5 | Sanitized `env -i PATH=/usr/bin:/bin:/usr/sbin:/sbin ./bin/ffmpeg -hide_banner -version` | Exit 0, no loader errors |
| C6 | VP8/Opus WebM export with raw RGBA and f32le fixtures (RI2.14.2 method) | Exit 0; valid, nonempty media with expected streams |
| C7 | Move stage to another arbitrary directory; repeat C3, C5, C6 | All repeat tests pass |
| C8 | Temporarily remove each staged dylib, observe expected loader failure, restore and relaunch | Both dependencies proven, successful recovery |
| C9 | Archive logs, SHA-256 manifests, machine metadata, test commands, reviewer/date and PASS/FAIL outcomes | Evidence complete, stored privately |

**Decision:** RI2-DEPS clean-machine PASS requires C1–C9 PASS on both native architectures. Current state is **PENDING**. Development-Mac ARM64 and Intel Rosetta are complete; they must not be counted as clean-host PASS.

## Release gates unaffected

Licensing/legal review, exact-version source notices, Developer ID/hardened runtime signing, notarization/stapling/Gatekeeper, production SBOM/checksums/security review, and production installer regression remain independent open gates. No production distribution authorization.

**Protected:** `Working`, `main`, Draft PR #14; no merge or release activation.
