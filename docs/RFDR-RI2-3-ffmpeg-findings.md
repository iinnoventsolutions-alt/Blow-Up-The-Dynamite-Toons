# RFDR-RI2.3 — FFmpeg License and Dependency Findings Review

**Source:** GitHub Actions run [44453110865](https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/44453110865), commit `6afd01fa2d8a4875809fe37310d53cdd207971fe`; ARM64 job 135321594243 and Intel job 135321594478. Reviewed logged `SUMMARY.md` content and job completion; detailed artifact files are available in the run for further inspection.

**Scope:** Findings and next steps only. No production redistribution authorization.

## Confirmed architecture comparison

| Field | ARM64 | Intel x64 |
| --- | --- | --- |
| FFmpeg version | 9.0.2 | 9.0.1 |
| Installation prefix | `/opt/homebrew/Cellar/ffmpeg/9.0.2_1` | `/usr/local/Cellar/ffmpeg/9.0.1` |
| Build options | `--enable-shared --enable-version3 --enable-gpl --enable-libvpx --enable-libopus` | Same named options |
| Other enabled options | `--enable-libx264 --enable-libx265 --enable-openssl --enable-libsvtav1 --enable-libmp3lame` | Same named options |
| Dynamic dependency examples | `libx264.165.dylib`, `libx265.217.dylib`, `libvpx.12.dylib`, `libopus.0.dylib`, `libcrypto.4.dylib` | `libx264.165.dylib`, `libx265.216.dylib`, `libvpx.12.dylib`, `libopus.0.dylib`, `libcrypto.3.dylib` |

The workflow's recursive inventory lists FFmpeg libraries and Homebrew-linked third-party dylibs for both architectures. The logged summaries are not a complete substitute for reviewing the archived raw dependency graph and license documents.

## Findings

**RI2.3-F01 — HIGH / Release blocker: license obligations unresolved.** Both observed builds have `--enable-gpl` and `--enable-version3` and link to additional codec libraries beyond the app's libvpx/libopus export requirements. These flags materially affect licensing analysis; they do **not** by themselves establish a final license classification for every component or legal compliance. Collect exact build/license texts, component licenses, source/offer and notice obligations, and qualified legal review before distribution.

**RI2.3-F02 — HIGH / Release blocker: dynamic dependency closure unresolved.** The executable depends on multiple Homebrew-path dylibs. The existing developer installer workflow copies only the executable. A self-contained production distribution requires a complete dependency closure, safe Mach-O install names/rpaths, architecture validation, nested code signing, and clean-machine tests.

**RI2.3-F03 — MEDIUM: architecture/version drift.** ARM64 uses FFmpeg 9.0.2 and Intel 9.0.1, with differences including x265, OpenSSL and libvpx versions. Pin reproducible per-architecture builds and record hashes and dependency manifests before release.

**RI2.3-F04 — HIGH / Release blocker: release trust gates unverified.** Developer ID signing, hardened runtime, notarization, stapling and Gatekeeper verification have not been established for production FFmpeg installers.

**RI2.3-F05 — MEDIUM: evidence scope limitations.** Successful evidence capture proves command execution, not full license clearance, complete @rpath resolution on a clean Mac, absence of transitive missing libraries, or redistributability. Full artifact-level inspection and license-text mapping remain necessary.

## Recommended RI2.4

1. Evaluate a **minimal FFmpeg build** restricted to needed WebM `libvpx` and `libopus` functionality, excluding GPL-only/nonessential components where feasible. Do not assert that minimal configuration is automatically LGPL-compliant; validate actual configure output and all component licenses.
2. Capture a version-pinned manifest, source provenance, build configuration, SHA-256 and transitive dylib graph for both architectures.
3. Add a **non-distributing** CI gate that fails when GPL/nonfree flags or unresolved Homebrew-path dependencies are present in the candidate configuration; retain developer-only workflow unchanged.
4. Perform legal and security review before any production packaging, signing or release approval.

## Constraints

No modifications to `Working`, `main`, or Draft PR #14; no production activation, distribution, or merge. This report documents technical evidence and release blockers, not legal advice.
