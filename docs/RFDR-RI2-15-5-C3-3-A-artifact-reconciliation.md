# RI2.15.5-C3.3-A — Original evidence artifact reconciliation

**Status: PASS for original CI-to-approved-staged-runtime hash traceability; source provenance checkpoint C3.3 remains OPEN.**

GitHub Actions run 44661662574, evidence ZIP artifacts ARM64 14594904533 and x64 14596167258 were downloaded and inspected directly. Original jobs: ARM64 136041094967, x64 136041094715.

## Original source/build evidence

- Both artifacts contain `ffmpeg-source-sha.txt` = `db69d06eeeab4f46da15030a80d539efb4503ca8` (FFmpeg tag n7.1.1), `buildconf.txt` with identical minimal flags, `configure.log`, `binary-sha256.txt`, `PROVENANCE.txt`, relocation and dependency-closure records.
- CI built FFmpeg from upstream git tag using `./configure --disable-doc` plus required flags and `make -C ffmpeg-src -j 4 ffmpeg`.
- ARM64 Homebrew libvpx 1.17.0, Opus 1.6.1; x64 libvpx 1.16.0, Opus 1.6.1, per job logs and dependency closure. This corrects prior uniform libvpx-version assumption.
- Original *pre-relocation compiled executable* hashes in `binary-sha256.txt` differ from the approved staged hashes, as expected after runtime relocation: ARM64 `cc88d18b0580cec56e0f833b9e0f0673044a8142373cdab17cdf3b498229beca`; x64 `ad9d3da9c84baa68298273f285f5d1d83878cd93f591f403604a547469316787`.

## Verified staged hashes from `ri2-14-1-runtime-sha256.txt`

| Architecture | Component | Evidence SHA-256 | Previously approved B3 | Result |
|---|---|---|---|---|
| ARM64 | bin/ffmpeg | b847829ec30ae04ba7550abf58b705f5e9aef79cd0dc901ad4fbc9b111d83d7f | same | PASS |
| ARM64 | lib/libvpx.12.dylib | 2dde11fb9fe1989ba5e527644f73c7b1a3f97dc4ba19a03aa79724e25ec19d3d | same | PASS |
| ARM64 | lib/libopus.0.dylib | 3da5c30dbd08758134e0ba448499114f829736d28134c00b964cf6e73d3bef80 | same | PASS |
| x64 | bin/ffmpeg | 9d38b736168039737fec5424e47b37975612bcffdcbec74c618f43e49ece1fbc | same | PASS |
| x64 | lib/libvpx.12.dylib | 25ac39ba340a401b8fa2483a737a6da812f1653baa0637336dc83e68e3c11ba3 | same | PASS |
| x64 | lib/libopus.0.dylib | 761ed15901bb3a71954ed01388db64260c4915c3892a0c943a50c2e16ed68fea | same | PASS |

The two `ri2-8-relocated-closure.json` records show expected `@executable_path/../lib` links from ffmpeg and `@loader_path` for codec dylibs; no missing dependencies reported in the original CI closure checks.

## Remaining gaps

- Exact historical Homebrew formula revisions, bottle digests, source archive checksums, patch status and license provenance for ARM64 libvpx 1.17.0, Intel libvpx 1.16.0, and both Opus 1.6.1 installations are not included in these ZIPs.
- Corresponding-source delivery and LGPL legal compliance remain open. Artifact provenance is not redistribution authorization.

**Decision:** Close C3.3-A *artifact reconciliation* as PASS; retain C3.3 source-provenance gate OPEN. No rebuild, app change, production activation, distribution, or changes to Working/main/Draft PR #14.
