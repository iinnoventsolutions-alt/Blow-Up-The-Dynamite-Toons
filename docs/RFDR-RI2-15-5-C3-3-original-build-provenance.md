# RI2.15.5-C3.3 — Original GitHub Actions build provenance review

**Status: PARTIAL PASS / OPEN** — historical build logs recovered; source-to-shipped-binary completeness and source delivery not yet verified.

## Original build evidence

GitHub Actions run `44661662574` jobs `136041094967` (ARM64) and `136041094715` (x64) both succeeded. Evidence artifacts: ARM64 `14594904533`, x64 `14596167258` (artifact listing confirms they are unexpired).

- Both jobs cloned `https://github.com/FFmpeg/FFmpeg.git` with `--depth 1 --branch n7.1.1`; recorded FFmpeg commit `db69d06eeeab4f46da15030a80d539efb4503ca8` and exact tag check.
- Both jobs configured `./configure --disable-doc` plus `requiredConfigureFlags` from `release-audit/ri2-4-minimal-ffmpeg-candidate.json`, then ran `make -C ffmpeg-src -j 4 ffmpeg`.
- Both jobs installed codec dependencies via `brew install pkg-config libvpx opus nasm age`, using Homebrew bottles, not local source builds.
- **Architecture difference confirmed:** ARM64 installed libvpx `1.17.0` (arm64_sequoia bottle) and Opus `1.6.1`; x64 installed libvpx `1.16.0` (sonoma bottle) and Opus `1.6.1`.
- Both jobs used repository commit `fee3226355ffe13863066c35c2eabc962e229e37` as checkout for build script/config.
- Both generated SHA-256 binary evidence, build configuration, source SHA, smoke test, and provenance files.

## Corrections to prior assumptions

The previous uniform `libvpx 1.16.0` source version assumption was incorrect for ARM64. The dylib ABI name `libvpx.12.dylib` is not a reliable indicator of source package version. The current Homebrew ARM64 `libvpx 1.17.0` metadata is version-consistent with ARM64 build logs, but current formula/source checksum does not prove exact historical bottle provenance.

## Remaining C3.3 evidence

1. Inspect historical artifacts for component checksums and original source details, and compare to approved B3 runtime hashes.
2. Record exact Homebrew bottle digest/formula revision/source archive for libvpx 1.17.0 ARM64, 1.16.0 x64, Opus 1.6.1 both; distinguish source archive checksums from bottle and dylib hashes.
3. Check FFmpeg modifications/patch status, build environment and instructions required for corresponding source. Build logs show direct clone/configure/make, not an independent source-archive hash.
4. Validate source-to-staged-binary traceability; do not claim release approval.

## Restrictions

No rebuild, Homebrew changes, production export activation, release, Working/main/PR#14 modifications or merge. Distribution remains NO-GO.
