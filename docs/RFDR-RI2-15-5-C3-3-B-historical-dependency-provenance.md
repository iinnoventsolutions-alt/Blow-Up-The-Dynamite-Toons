# RI2.15.5-C3.3-B — Historical dependency provenance assessment

**Decision: PARTIAL PASS / OPEN.** Historical build dependency versions and upstream source release references identified; exact historical Homebrew bottle/formula evidence is incomplete.

## Confirmed from original GitHub Actions run 44661662574

| Component | ARM64 (arm64_sequoia) | Intel (sonoma) |
|---|---|---|
| libvpx | Homebrew bottle 1.17.0 | Homebrew bottle 1.16.0 |
| Opus | Homebrew bottle 1.6.1 | Homebrew bottle 1.6.1 |

Original logs show `brew install pkg-config libvpx opus nasm age`, not building codec sources locally. FFmpeg source is upstream git n7.1.1 commit `db69d06eeeab4f46da15030a80d539efb4503ca8`, compiled from source in both jobs.

## Source release references (not historical bottle proof)

- libvpx 1.17.0: user's current Homebrew metadata gives `https://github.com/webmproject/libvpx/archive/refs/tags/v1.17.0.tar.gz`, SHA-256 `1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a`, BSD-3-Clause. Current arm64_sequoia bottle digest `dd7924c0a05fa5f840f17ab9f5fac72d8672d75b2a7d44dbbf811274f70d17d6`; **not yet established as the original CI bottle digest**.
- libvpx 1.16.0: Buildroot 2026-02-01 patch independently references upstream `webmproject/libvpx` v1.16.0 tarball with SHA-256 `7a479a3c66b9f5d5542a4c6a1b7d3768a983b1e5c14c60a9396edc9b649e015c` (https://lists.buildroot.org/pipermail/buildroot/2026-February/795775.html). This is an **external Buildroot release hash**, not confirmed to match historical Homebrew formula URL or bottle hash.
- Opus 1.6.1: user's current Homebrew metadata gives `https://ftp.osuosl.org/pub/xiph/releases/opus/opus-1.6.1.tar.gz`, SHA-256 `6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1`, BSD-3-Clause. Current arm64_sequoia bottle digest `85d6f1e885117016478e468f92033f648d9bab05210708fe195cacefe5be8266`; not yet proven identical to CI install. Intel Sonoma bottle digest remains unknown.
- Homebrew source/bottle checksum distinction documented at https://github.com/Homebrew/brew/blob/main/docs/Checksum-Requirements.md and https://github.com/Homebrew/brew/blob/main/docs/Bottles.md.

## Outstanding for C3.3 closure

1. Recover historical `homebrew/core` formula revision(s), bottle SHA-256 and source SHA-256 for Intel Sonoma libvpx 1.16.0 and Opus 1.6.1, plus ARM64 Sequoia libvpx 1.17.0 and Opus 1.6.1 at original CI time.
2. Verify historical formula patches, bottle rebuild identifiers, and any relevant license notices.
3. Correlate historical source/bottle metadata to original CI dependency installation, beyond runtime dylib B3 hashes.
4. Determine corresponding-source/build-instruction availability and delivery in C3.4; legal review remains separate.

No binary changes, rebuilds, package installations, Working/main/Draft PR #14 changes, or distribution authorization.
