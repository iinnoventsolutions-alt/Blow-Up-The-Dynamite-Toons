# RI2.15.5-C3.3-C — Historical Homebrew formula investigation

**Status: PARTIAL / OPEN.** Reviewed upstream Homebrew formula files and current metadata; no unsupported historical checksum claims.

## Evidence recovered

Original Actions run 44661662574 logs establish:
- ARM64 Sequoia: libvpx 1.17.0, Opus 1.6.1 Homebrew bottles.
- Intel Sonoma: libvpx 1.16.0, Opus 1.6.1 Homebrew bottles.
- Both FFmpeg builds from upstream n7.1.1 git commit db69d06eeeab4f46da15030a80d539efb4503ca8.
- Staged dylib hashes match original evidence artifacts, as recorded in C3.3-A.

Current upstream Homebrew/homebrew-core files inspected:
- `Formula/lib/libvpx.rb`: libvpx 1.17.0, source URL `https://github.com/webmproject/libvpx/archive/refs/tags/v1.17.0.tar.gz`, source SHA-256 `1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a`, ARM64 Sequoia bottle SHA-256 `dd7924c0a05fa5f840f17ab9f5fac72d8672d75b2a7d44dbbf811274f70d17d6`. **Current formula contains an inline macOS compatibility patch**, even though the user's JSON `patches: []` did not enumerate it; do not infer original build patch status from that JSON.
- `Formula/o/opus.rb`: Opus 1.6.1, source URL `https://ftp.osuosl.org/pub/xiph/releases/opus/opus-1.6.1.tar.gz`, source SHA-256 `6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1`, ARM64 Sequoia bottle SHA-256 `85d6f1e885117016478e468f92033f648d9bab05210708fe195cacefe5be8266`, Intel Sonoma bottle SHA-256 `0849d017c155c55ea1fb01b6156ff5dc77f2a2d7fec84592a099c32f6db9eef1`.
- Both current formulas declare BSD-3-Clause.

**Caveat:** Current formula checksums and bottle digests are candidate metadata, **not independently proven to be the historical exact blobs installed in CI**. Homebrew may rebuild bottles without a source version change; source archive, bottle archive, staged dylib, and FFmpeg binary hashes are distinct. The Intel libvpx 1.16.0 historical formula/bottle digest is still not established. Original CI logs did not print bottle digest or formula commit.

## Recommended targeted next evidence

Read-only inspect the original Homebrew bottle metadata embedded in the CI-installed dependency artifacts if available, or historical Homebrew/core formula commits and GitHub Packages manifests dated to the original CI installation. Capture exact formula Git commit, patch content, source SHA, bottle rebuild and platform-specific bottle SHA for all four dependency installations. Cross-check source-to-binary traceability and archive retention. No installs or rebuilds.

**Gate:** C3.3-C partial; overall C3.3 OPEN. Distribution NO-GO. No modifications to Working/main/Draft PR #14, no production activation or release.
