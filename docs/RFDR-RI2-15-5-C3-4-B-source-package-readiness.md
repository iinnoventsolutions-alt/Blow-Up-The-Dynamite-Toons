# RI2.15.5-C3.4-B — Recipient-facing source package readiness review

**Decision: REVIEW COMPLETE / PACKAGE NOT READY / COMPLIANCE OPEN / DISTRIBUTION NO-GO.**

Read-only assessment of the repository's C3.4-A component inventory, FFmpeg configuration, license texts, and prior original CI artifacts. This checkpoint defines a future source-package manifest and acceptance criteria; **no distributable source package has been created, downloaded, published, or approved**.

## Source package manifest and verification gates

| Intended package item | Evidence/reference | Status before recipient delivery |
|---|---|---|
| FFmpeg n7.1.1 corresponding source | upstream Git commit `db69d06eeeab4f46da15030a80d539efb4503ca8` | IDENTIFIED, source tree not packaged/validated here |
| ARM64 libvpx 1.17.0 source | upstream `v1.17.0` tarball, SHA-256 `1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a` | IDENTIFIED, archive not downloaded/hash-verified here |
| Intel libvpx 1.16.0 source | upstream `v1.16.0` tarball, SHA-256 `7a479a3c66b9f5d5542a4c6a1b7d3768a983b1e5c14c60a9396edc9b649e015c` | IDENTIFIED, archive not downloaded/hash-verified here |
| Opus 1.6.1 source (both) | upstream tarball SHA-256 `6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1` | IDENTIFIED, archive not downloaded/hash-verified here |
| Exact FFmpeg build configuration | `release-audit/ri2-4-minimal-ffmpeg-candidate.json`, original CI `buildconf.txt`/`configure.log` | EVIDENCED, recipient-readable instructions and pinned toolchain still needed |
| Codec build recipes and modifications | Homebrew historical formula snapshots in C3.3-D | PARTIAL, exact installed formula/bottle/patch lineage unknown |
| Relocation and packaging instructions | original CI relocation evidence and existing repository scripts | PARTIAL, source package must explain applicable transformations and signing |
| License and copyright notices | `release-audit/licenses/` files | PRESENT, recipient-facing accuracy/completeness not signed off |
| Source access/retention policy | none approved | OPEN |

## License notice validation

- `FFmpeg-n7.1.1-LICENSE.md` reviewed: overview identifies LGPL v2.1+ default and component-specific attribution cautions. Its license classification is consistent with C3.2 approved binaries' `ffmpeg -L` output.
- `FFmpeg-n7.1.1-COPYING.LGPLv2.1` directly inspected: starts with the full GNU Lesser General Public License version 2.1 heading, copyright, and preamble; file length 26,526 characters. This is a **file-content check, not legal completeness certification**.
- `libvpx-v1.16.0-LICENSE` reviewed: BSD-style redistribution and attribution terms. **Version mismatch for ARM64 libvpx 1.17.0**. Do not assert version 1.17.0 notice coverage until checked against that source release; do not silently rename existing notice.
- `opus-v1.6.1-COPYING` reviewed: redistribution terms, attribution and patent-license reference URLs. Verify package presentation and complete applicable notices with legal.
- `scripts/check-ri2-license-inventory.mjs` is a documentation-presence/policy checker only. Its comment claiming exact `ffmpeg -L` evidence is missing is **stale after C3.2**; no script changes made under this documentation-only checkpoint.

## Required acceptance checks before any source package may be approved

1. Acquire exact source trees/archives and independently verify commit/hash, preserve original license and copyright files, and record archive SHA-256.
2. Resolve historical Homebrew formula/bottle/patch lineage or obtain an explicit documented compliance disposition; avoid asserting exact original recipe where not established.
3. Supply recipient-readable, architecture-specific configure/build and relevant relocation instructions, toolchain versions, and all applicable modifications.
4. Verify exact ARM64 libvpx 1.17.0 license text and any additional FFmpeg file-specific notices; check complete LGPL terms and third-party notices.
5. Define and review recipient source access/delivery/retention, ability to replace/relink libraries, and any license-specific requirements with qualified legal/compliance reviewer.
6. Only after separate approval, validate actual production package notices and source delivery against a signed release candidate.

## Recommendation

**C3.4-B review is complete; package readiness FAIL/OPEN, not a release failure.** Next targeted checkpoint: **C3.4-C version-specific notice and source material verification**, preferably collecting exact libvpx 1.17.0 license text and source archive integrity first. Avoid rebuilding accepted binaries or repeating completed architecture tests.

No modifications to `Working`, `main`, Draft PR #14, binaries, export flags or release configuration. **Distribution NO-GO.**
