# RI2.15.5-C3.4-E — Source package manifest and build-material gap disposition

**Checkpoint: DOCUMENTATION PASS. Recipient source package: NOT ASSEMBLED. Overall compliance: OPEN. Distribution: NO-GO.**

## Evidence baseline

- C3.4-D user-confirmed `shasum -a 256 -c`: libvpx 1.17.0, libvpx 1.16.0 and Opus 1.6.1 all `OK`. Local archives are under `~/Projects/RI2-C34D-Source-Audit/` on user's Mac; they are **not** GitHub artifacts or recipient downloads.
- FFmpeg n7.1.1 original CI source Git commit: `db69d06eeeab4f46da15030a80d539efb4503ca8`.
- C3.4-C direct upstream libvpx 1.17.0 LICENSE text equals existing repository libvpx 1.16.0 license text. Filename/package labeling remains to address.
- C3.3-E documents unresolved original Homebrew formula and bottle identities; this remains an exception.

## Proposed recipient-facing source manifest (NOT a published package)

| Proposed relative path | Material | Status / prerequisite |
|---|---|---|
| `sources/ffmpeg/ffmpeg-n7.1.1/` | FFmpeg source at pinned Git SHA, with original source notices | NOT STAGED; retrieve and verify commit, archive/tree identity |
| `sources/libvpx/libvpx-1.17.0.tar.gz` | ARM64 codec source, expected SHA `1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a` | VERIFIED ON USER MAC; copy into future source package and reverify |
| `sources/libvpx/libvpx-1.16.0.tar.gz` | Intel codec source, expected SHA `7a479a3c66b9f5d5542a4c6a1b7d3768a983b1e5c14c60a9396edc9b649e015c` | VERIFIED ON USER MAC; copy/reverify |
| `sources/opus/opus-1.6.1.tar.gz` | Both architectures codec source, expected SHA `6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1` | VERIFIED ON USER MAC; copy/reverify |
| `build/ffmpeg-configure-arm64.txt`, `build/ffmpeg-configure-x64.txt` | Exact original CI `buildconf.txt` per architecture, with flags and environment | CI evidence EXISTS; not yet copied into recipient package |
| `build/ffmpeg-build.md` | Pinned source checkout, `./configure --disable-doc` plus verified minimal flags, `make -C ffmpeg-src -j 4 ffmpeg` | OUTLINE ONLY; add pinned compiler/SDK/Homebrew/toolchain and verified working directory |
| `build/codecs-arm64.md`, `build/codecs-x64.md` | Version-specific Homebrew formula recipes, patch inputs, build dependencies and commands | INCOMPLETE; historical formula snapshots only; installed bottle identity unverified |
| `build/relocation-and-linking.md` | `install_name_tool`/runtime relocation and dependency-closure instructions as actually applied | CI evidence EXISTS; needs exact reviewed steps |
| `licenses/FFmpeg-LICENSE.md`, `licenses/COPYING.LGPLv2.1` | FFmpeg license overview and LGPL terms | Existing repository files; check source/package completeness |
| `licenses/libvpx-1.16.0-LICENSE`, `licenses/libvpx-1.17.0-LICENSE` | Explicitly labeled version-specific notices | Upstream 1.17.0 text matches current 1.16.0 text; separate labeling/package presentation not done |
| `licenses/opus-1.6.1-COPYING` | Opus terms and attribution | Existing repository file; final package check pending |
| `README-SOURCE.md`, `SHA256SUMS` | Source access, architecture map, integrity verification, recipient instructions and legal-reviewed retention/contact | NOT WRITTEN / NOT APPROVED |

These are **proposed paths only**; no files have been assembled at these locations. Archive checksums refer to upstream source bytes, not the six runtime binaries.

## Build-material gap disposition

1. **FFmpeg:** exact source commit and flags evidenced. Source tree, exact CI build scripts/toolchain versions, source modifications (if any), and recipient-ready steps remain unassembled. Do not claim reproducibility from `requiredConfigureFlags` alone.
2. **Codecs:** three archives verified locally. Original Homebrew formula revision, bottle digest and complete patches remain unproven; retain C3.3-E exception and seek reviewer disposition rather than repeat unproductive provenance searches.
3. **Linking:** accepted FFmpeg executable uses external libvpx and libopus dylibs; confirm actual packaged linkage, LGPL applicability, recipient ability to replace/relink, and restrictions with qualified reviewer.
4. **Notices:** libvpx 1.17.0 text comparison passed; both version labels and package placement remain open. Full license/attribution review remains open.
5. **Delivery:** source access/retention mechanism and production package verification not authorized or completed.

## Recommended next gate

**C3.4-F — Compliance reviewer decision packet:** consolidate the verified facts, explicit historical-provenance exception, LGPL linking/source-delivery questions and release-blocking signoff checklist. This is more useful than another source checksum run. If source package assembly is later authorized, stage only the reviewed inputs and rerun integrity checks on the assembled package.

**Boundaries:** documentation-only branch `RFDR-RI2-Production-Readiness`; no changes to Working, main, Draft PR #14, approved runtimes, production export flags or distribution.
