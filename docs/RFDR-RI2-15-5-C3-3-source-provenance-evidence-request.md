# RI2.15.5-C3.3 — Source provenance evidence request

**Status: IN PROGRESS — awaiting source provenance evidence; NOT accepted or release cleared.**

## Known baseline

- FFmpeg n7.1.1 ARM64/x64 executable hashes and binary LGPL v2.1-or-later output accepted in C3.2.
- libvpx 1.16.0 and libopus 1.6.1 are the expected linked libraries; staged dylib B3 hashes verified in C2.4.
- RI2.15.2-B evidence says both builds used Homebrew library paths before relocation, but this alone does not establish exact source archives, patches, source checksums, or complete build scripts.
- `release-audit/licenses/FFmpeg-n7.1.1-LICENSE.md` provides license text, not source provenance.
- Exact source tarball checksums and whether Homebrew formula patches were applied are **not established** by reviewed evidence.

## Requested non-mutating evidence

On the build machine, collect `brew info --json=v2 ffmpeg libvpx opus` if installed; `brew list --versions ffmpeg libvpx opus`; `brew --cache --build-from-source libvpx` and opus only if applicable (do not trigger installs); inspect available GitHub Actions run 44661662574 build logs/artifacts for exact download URLs, tags, checksums, configure commands, patch application and build environment. Record any missing artifacts as unresolved rather than inferring provenance.

For FFmpeg n7.1.1, establish original source archive URL, sha256, exact tag/commit, modifications/patches, build recipe, architecture-specific options and dependency versions. For each codec, distinguish upstream source release from Homebrew formula bottle provenance, and record formula revision and any applied patches.

## Gate

C3.3 remains OPEN until exact source-to-binary traceability and reproducibility evidence is reviewed. No binaries rebuilt or production activation; no changes to Working, main or Draft PR #14; no distribution authorization.
