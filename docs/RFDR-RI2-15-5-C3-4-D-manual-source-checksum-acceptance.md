# RI2.15.5-C3.4-D — Manual source archive checksum acceptance

**Status: PASS — C3.4-D technical checksum verification CLOSED. C3.4 compliance OPEN. Distribution NO-GO.**

## User-reported macOS Terminal verification

The user executed the C3.4-D verification procedure and confirmed the exact expected `shasum -a 256 -c expected-sha256.txt` results:

```text
libvpx-1.17.0.tar.gz: OK
libvpx-1.16.0.tar.gz: OK
opus-1.6.1.tar.gz: OK
```

Expected source archive SHA-256 values:
- libvpx 1.17.0: `1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a`
- libvpx 1.16.0: `7a479a3c66b9f5d5542a4c6a1b7d3768a983b1e5c14c60a9396edc9b649e015c`
- Opus 1.6.1: `6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1`

**Evidence type:** User-confirmed expected checksum output; not independently re-downloaded by assistant and no full Terminal transcript or archived artifact was uploaded. The archives reside in the user's `~/Projects/RI2-C34D-Source-Audit` directory, per provided procedure.

## Closure boundary

The three upstream source archive checksum checks passed. This does **not** establish which Homebrew bottles were installed in the original CI jobs, prove complete corresponding-source availability for FFmpeg or codec patches, resolve LGPL replacement/relinking obligations, or authorize production distribution.

**Recommended next checkpoint: C3.4-E** — read-only source package manifest and build-instructions gap disposition, using the three verified local archives. No redundant runtime testing.

No modifications to Working, main, Draft PR #14, binaries or production export; no release.
