# RI2.15.5-C3.4-A — Component source inventory, build instructions and license checklist

**Status: PREPARATION COMPLETE / COMPLIANCE OPEN / DISTRIBUTION NO-GO.** Documentation-only review against repository source, C3.2/C3.3 records and original CI evidence. No claim of reproducible rebuild or legal clearance.

## Component inventory

| Architecture | Component | Source reference | Source digest / identity | Approved staged binary SHA-256 | License evidence | Remaining uncertainty |
|---|---|---|---|---|---|---|
| ARM64 | FFmpeg n7.1.1 | https://github.com/FFmpeg/FFmpeg.git tag n7.1.1 | git commit db69d06eeeab4f46da15030a80d539efb4503ca8 | b847829ec30ae04ba7550abf58b705f5e9aef79cd0dc901ad4fbc9b111d83d7f | `ffmpeg -L` reports LGPL-2.1-or-later | source bundle/build instructions delivery, patch/toolchain inventory |
| Intel x64 | FFmpeg n7.1.1 | same | same | 9d38b736168039737fec5424e47b37975612bcffdcbec74c618f43e49ece1fbc | same | same |
| ARM64 | libvpx 1.17.0 | https://github.com/webmproject/libvpx/archive/refs/tags/v1.17.0.tar.gz | source archive SHA-256 1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a | 2dde11fb9fe1989ba5e527644f73c7b1a3f97dc4ba19a03aa79724e25ec19d3d | Homebrew formula BSD-3-Clause | exact installed bottle/formula revision and patches unverified; current bundled notice filename says v1.16.0 |
| Intel x64 | libvpx 1.16.0 | https://github.com/webmproject/libvpx/archive/refs/tags/v1.16.0.tar.gz | source archive SHA-256 7a479a3c66b9f5d5542a4c6a1b7d3768a983b1e5c14c60a9396edc9b649e015c | 25ac39ba340a401b8fa2483a737a6da812f1653baa0637336dc83e68e3c11ba3 | bundled v1.16.0 license file and historical formula BSD-3-Clause | exact installed bottle/formula revision unverified |
| ARM64 | Opus 1.6.1 | https://ftp.osuosl.org/pub/xiph/releases/opus/opus-1.6.1.tar.gz | source archive SHA-256 6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1 | 3da5c30dbd08758134e0ba448499114f829736d28134c00b964cf6e73d3bef80 | bundled COPYING and historical formula BSD-3-Clause | exact installed bottle/formula revision unverified |
| Intel x64 | Opus 1.6.1 | same | same | 761ed15901bb3a71954ed01388db64260c4915c3892a0c943a50c2e16ed68fea | same | same |

Source hashes above refer to *upstream source archives* and are not SHA-256 of the approved staged dylibs. FFmpeg identity is a Git commit, not a tarball digest. Historical bottle candidates are recorded in C3.3-D; do not treat them as proven installed bottle identities.

## Build instructions inventory

Original GitHub Actions run `44661662574`, checkout `fee3226355ffe13863066c35c2eabc962e229e37`:
1. `brew install pkg-config libvpx opus nasm age` on architecture-specific macOS runner.
2. `git clone --depth 1 --branch n7.1.1 https://github.com/FFmpeg/FFmpeg.git ffmpeg-src`; verify Git SHA `db69d06eeeab4f46da15030a80d539efb4503ca8`.
3. Configure with `./configure --disable-doc` and `requiredConfigureFlags` from `release-audit/ri2-4-minimal-ffmpeg-candidate.json`. No `--enable-gpl`, `--enable-version3`, or `--enable-nonfree` flags.
4. `make -C ffmpeg-src -j 4 ffmpeg`.
5. Runtime relocation/closure verification evidenced in original CI ZIPs and C3.3-A; full toolchain versions, historical formula revisions and patch sets must still be preserved for a recipient-facing source/build package.

## Existing notice files inspected

- `release-audit/licenses/FFmpeg-n7.1.1-LICENSE.md` — FFmpeg licensing overview; contains component-specific cautions.
- `release-audit/licenses/FFmpeg-n7.1.1-COPYING.LGPLv2.1` — inventoried by checker; exact contents were not separately reviewed in this checkpoint.
- `release-audit/licenses/libvpx-v1.16.0-LICENSE` — BSD-style text and attribution, but filename does not match ARM64 libvpx 1.17.0. Confirm version-correct notice text/attribution and package presentation before release.
- `release-audit/licenses/opus-v1.6.1-COPYING` — BSD-style terms, attribution, and patent-license references.

`scripts/check-ri2-license-inventory.mjs` checks four paths, content length and configuration flags, and explicitly states inventory-only / distribution not authorized. It does **not** prove complete notices, actual source delivery, rights to modify/relink or legal compliance. Its comment about missing exact `ffmpeg -L` output is outdated relative to C3.2; update only under separately authorized maintenance.

## Compliance checklist / disposition

- [x] Identify FFmpeg exact upstream Git commit and build-flag policy.
- [x] Identify codec upstream source URLs, versions, source archive SHA-256 candidates, and original staged runtime hashes.
- [x] Inventory existing license notice files and script limitations.
- [ ] Preserve downloadable matching source archives and full source/build scripts in a recipient-facing source package; validate source hashes.
- [ ] Reconcile exact installed Homebrew bottle/formula lineage or obtain reviewer disposition for documented gaps.
- [ ] Determine and preserve relevant modifications/patches and build toolchain details per architecture.
- [ ] Verify libvpx 1.17.0 license notice, all copyright attributions, and complete LGPL text.
- [ ] Review actual linked-library scope, recipient replacement/relinking ability, and other LGPL obligations with legal/compliance.
- [ ] Approve a source distribution/access and retention mechanism.
- [ ] Obtain explicit legal, release-owner, production-export, packaging, signing/notarization and distribution approvals.

**Decision:** C3.4-A inventory/checklist creation PASS; C3.4 compliance gate OPEN. Do not activate production FFmpeg, rebuild binaries, modify Working/main/Draft PR #14, or distribute.
