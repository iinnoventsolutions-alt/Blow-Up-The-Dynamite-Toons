# RI2.15.5-C3.4-C — Version-specific libvpx license and source material verification

**Status: PARTIAL PASS / SOURCE PACKAGE OPEN / DISTRIBUTION NO-GO.** Read-only verification, no package/binary modifications.

## Direct upstream license verification

Retrieved `LICENSE` from GitHub repository `webmproject/libvpx` at ref `v1.17.0` and the project file `release-audit/licenses/libvpx-v1.16.0-LICENSE` at branch `RFDR-RI2-Production-Readiness`.

**Exact content equality: PASS.** Both returned file contents have length 1,537 characters and compare exactly, including copyright, BSD-style conditions and disclaimer. Thus the existing license *text* is consistent with upstream libvpx v1.17.0. The file *name* only identifies v1.16.0; future packaging should clearly identify both shipped libvpx versions and ensure appropriate notices are accessible to recipients. Do not rename the existing file in this checkpoint.

## Source identity and integrity status

| Item | Reference / expected identity | Verification level |
|---|---|---|
| ARM64 libvpx v1.17.0 license | `webmproject/libvpx` tag `v1.17.0`, file `LICENSE` | Direct upstream file retrieved and byte-for-byte string content compared to repository notice — PASS |
| ARM64 libvpx v1.17.0 source archive | `https://github.com/webmproject/libvpx/archive/refs/tags/v1.17.0.tar.gz`; expected SHA-256 `1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a` from Homebrew formula | Metadata verified previously; archive bytes **not downloaded or hashed in this checkpoint** |
| Intel libvpx v1.16.0 source archive | `https://github.com/webmproject/libvpx/archive/refs/tags/v1.16.0.tar.gz`; expected SHA-256 `7a479a3c66b9f5d5542a4c6a1b7d3768a983b1e5c14c60a9396edc9b649e015c` | Historical Homebrew formula metadata; archive bytes not independently checked here |
| Opus v1.6.1 source archive | `https://ftp.osuosl.org/pub/xiph/releases/opus/opus-1.6.1.tar.gz`; expected SHA-256 `6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1` | Homebrew metadata; archive bytes not independently checked here |
| FFmpeg n7.1.1 source | git SHA `db69d06eeeab4f46da15030a80d539efb4503ca8` | CI provenance established; recipient-facing source bundle not assembled |

## Remaining gates

- Verify actual downloaded source archive bytes and retain exact source packages, relevant patches, build instructions and copyright/license materials.
- Exact historical Homebrew bottle identity and patch lineage remain unresolved (C3.3-E exception).
- Complete source-package delivery/access, LGPL linking and recipient rights review, package notice presentation, legal approval, Developer ID/notarization and release approval remain outstanding.

**Decision:** C3.4-C libvpx 1.17.0 notice-text comparison PASS; archive integrity and full compliance OPEN. No binary rebuild, runtime modification, source-package distribution, production activation, or changes to Working/main/Draft PR #14. **Distribution NO-GO.**
