# RI2.15.5-C3.3-D — Historical formula and bottle candidate reconciliation

**Status: PARTIAL PASS; overall C3.3 OPEN.** Retrieved historical Homebrew/core formula snapshots. These prove that candidate formulas and checksums existed in repository history, but do not by themselves prove which exact bottle digest the original CI installed.

## GitHub historical formula snapshots

- `Homebrew/homebrew-core` commit `8114c1fab15645b194ba56cddcc6c98116941214`, `Formula/lib/libvpx.rb`: libvpx 1.16.0 source `https://github.com/webmproject/libvpx/archive/refs/tags/v1.16.0.tar.gz`, SHA-256 `7a479a3c66b9f5d5542a4c6a1b7d3768a983b1e5c14c60a9396edc9b649e015c`; Intel Sonoma bottle SHA-256 `198eadc026da61065d4f3c626c89bdc770c9109311e0b59db4f5ab0487345dea`; BSD-3-Clause. No inline `patch :DATA` in this inspected snapshot.
- `Homebrew/homebrew-core` commit `6870c97461c1e97c3bc3a3b60f42c04e3ed9917e`, `Formula/lib/libvpx.rb`: libvpx 1.17.0 source SHA-256 `1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a`; ARM64 Sequoia bottle SHA-256 **in that snapshot** `2476b7be93b0a47ca091583c16e576871b50e7e29cb84efe9f9b5bd805793371`; BSD-3-Clause. This differs from the *current* formula's ARM64 Sequoia bottle SHA-256 `dd7924c0a05fa5f840f17ab9f5fac72d8672d75b2a7d44dbbf811274f70d17d6`, demonstrating why historical bottle identity cannot be inferred from version alone.
- `Homebrew/homebrew-core` commit `5a26db82f1bd0a12f5be59cc7287834c82c06c21`, `Formula/o/opus.rb`: Opus 1.6.1 source SHA-256 `6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1`; ARM64 Sequoia bottle SHA-256 `85d6f1e885117016478e468f92033f648d9bab05210708fe195cacefe5be8266`; Intel Sonoma bottle SHA-256 `0849d017c155c55ea1fb01b6156ff5dc77f2a2d7fec84592a099c32f6db9eef1`; BSD-3-Clause.

## Original CI evidence retained

Run `44661662574` installed ARM64 libvpx 1.17.0 / Opus 1.6.1 and Intel libvpx 1.16.0 / Opus 1.6.1. It does not print original bottle SHA-256 or formula revision. C3.3-A verified all six staged runtime hashes against original CI artifact records. FFmpeg n7.1.1 source git SHA `db69d06eeeab4f46da15030a80d539efb4503ca8` verified.

## Important caveat and next action

There are at least two distinct candidate ARM64 Sequoia libvpx 1.17.0 bottle digests in historical/current formula snapshots. Determine original CI Homebrew formula revision/bottle manifest digest using original runner installation metadata, retained manifests or time-scoped historical commits; do not silently choose either candidate. Original installed bottle bytes or manifest may no longer be retained in evidence ZIPs.

**Closure boundary:** C3.3-D identifies credible upstream source archives and historical formula/bottle candidates, not exact historical installation identity or distribution compliance. Corresponding source, build instructions, patch status for installed bottles, LGPL obligations and legal approval remain open. Distribution NO-GO. No changes to Working/main/Draft PR #14; no binary rebuild or production activation.
