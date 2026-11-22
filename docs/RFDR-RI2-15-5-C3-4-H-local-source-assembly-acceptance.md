# RI2.15.5-C3.4-H — Local source-package assembly and integrity acceptance

**Status: AWAITING USER MAC EXECUTION / NOT YET PASS.** Internal review-only staging; no distribution.

## Inputs

Previously user-verified archives at `~/Projects/RI2-C34D-Source-Audit/`: `libvpx-1.17.0.tar.gz`, `libvpx-1.16.0.tar.gz`, `opus-1.6.1.tar.gz`. Source SHA-256 expected: `1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a`, `7a479a3c66b9f5d5542a4c6a1b7d3768a983b1e5c14c60a9396edc9b649e015c`, `6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1`.

FFmpeg n7.1.1 expected source Git commit: `db69d06eeeab4f46da15030a80d539efb4503ca8`.

## Execution boundary

Create a fresh local folder `~/Projects/RI2-C34H-Source-Review`; copy, never move, archives. Clone FFmpeg source at exact tag and verify `git rev-parse HEAD` equals pinned commit. Preserve complete source tree; generate `MANIFEST.sha256` for staged files and `SOURCE-IDENTITY.txt`. Add `INTERNAL-REVIEW-ONLY.txt` explaining non-distribution and open compliance gaps. Do not copy binary runtimes or package any release. Do not run configure/make.

## Acceptance criteria

1. Three staged codec archives each revalidate against exact SHA-256.
2. FFmpeg source HEAD matches pinned commit; record tree identity.
3. Manifest hashes are generated and `shasum -a 256 -c` passes.
4. No application, CI or runtime files modified.
5. Archive receipt and folder path reported for evidence record.

**Not included:** original CI buildconf files, historical Homebrew formula/bottle/patch lineage, full LGPL rights review, final notices and delivery policy. These remain open and block distribution.

**Restrictions:** no modifications to Working/main/Draft PR #14 or production export. **Distribution NO-GO.**
