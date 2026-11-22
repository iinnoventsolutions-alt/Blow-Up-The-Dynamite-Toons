# RI2.15.5-C3.4-F — Compliance reviewer decision packet and release-gate assessment

**Checkpoint: REVIEW PACKET PREPARED. Compliance signoff: NOT GRANTED. Production distribution: NO-GO.**

**Scope:** Evidence consolidation only on `RFDR-RI2-Production-Readiness`. This document is a decision packet, not legal advice, a legal opinion, a compliance certification, or authorization to ship.

## 1. Technical facts supported by existing evidence

| Subject | Verified evidence | Decision boundary |
|---|---|---|
| FFmpeg | Both architectures FFmpeg n7.1.1; Git commit `db69d06eeeab4f46da15030a80d539efb4503ca8`; CI minimal configure; staged binaries report LGPL v2.1-or-later | Configuration/license identification is **not** full LGPL compliance |
| Runtime integrity | All six staged FFmpeg/libvpx/Opus hashes reconcile with original CI artifacts; ARM64 and native Intel technical acceptance passed | No repeat architecture testing needed for this documentation gate |
| Codec source archives | C3.4-D user-confirmed SHA-256 OK for libvpx 1.17.0, libvpx 1.16.0 and Opus 1.6.1 | Verified on user's Mac; not yet assembled as recipient source package |
| libvpx 1.17.0 notice | C3.4-C direct upstream `LICENSE` equals existing repository v1.16.0 notice text | Version-specific labeling and package accessibility remain open |
| Historical Homebrew | C3.3-E preserved source/formula candidates and unresolved exact installed bottle/formula/patch lineage | Explicit provenance exception; **do not mark resolved** |
| Recipient source package | C3.4-E proposed manifest and build material gaps documented | Package not assembled, published, or validated |

## 2. Reviewer decisions required

| Gate | Question for reviewer / owner | Evidence still required | Owner | Status |
|---|---|---|---|---|
| L1: LGPL obligations | For the actual FFmpeg executable and external linked dylibs, what source, notices, replacement/relinking and debugging rights must be provided? | Final linkage graph, packaging design, license-specific analysis | Legal + build engineering | OPEN |
| L2: Source completeness | Does the proposed FFmpeg/codec source manifest include required corresponding source, applicable modifications, recipes, and toolchain/build instructions? | Actual staged package, archive hashes, exact build/relocation steps | Legal + build engineering | OPEN |
| L3: Provenance exception | Can the release proceed despite unknown exact historical Homebrew bottle/formula/patch identity? If not, what evidence is mandatory? | C3.3-E exception plus reviewer written disposition | Compliance/release owner | OPEN |
| L4: Notices | Are all component and file-specific copyright/license notices accurate and visible in the distributed package? | Final version-labeled notices, recipient package inspection | Legal + release engineering | OPEN |
| L5: Delivery | How will source and notices be made available, with what access, retention, and contact commitments? | Approved source delivery/retention policy and URLs or bundled materials | Legal + release owner | OPEN |
| R1: Production build | Is the FFmpeg runtime permitted in production package and is export activation approved? | Compliance approvals, fail-closed package checks, production end-to-end tests | Release owner | BLOCKED |
| R2: macOS distribution | What Developer ID/signing/notarization approach and release channels are approved? | Developer ID/notarization plan and release acceptance | Release owner | BLOCKED |
| R3: Branch/PR integration | Is integration into Working/main or Draft PR #14 authorized? | Explicit user approval after gates | Project owner | BLOCKED |

## 3. Engineering versus reviewer work

**Engineering preparation still required (not authorized by this checkpoint):**
- Stage FFmpeg n7.1.1 source at pinned commit, the three locally verified codec source archives, license files, original configure outputs and exact build/relocation instructions in a controlled source package.
- Record and verify package checksums; map architecture to source/build inputs and linked components.
- Confirm whether any local patches/modifications or additional notices apply; reconcile historical bottle identity only if reviewer requires it.
- Provide final package-linkage and replacement/relinking feasibility evidence.

**Decisions reserved for qualified legal/compliance reviewer and release owner:** obligations and acceptable LGPL fulfillment method, historical provenance exception acceptance, notices/source delivery mechanism, source retention, and permission to distribute.

## 4. Decision record

- **C3.4-F reviewer packet preparation:** PASS — evidence, exceptions and owners consolidated.
- **C3.4 overall:** OPEN — reviewer signoffs and package evidence absent.
- **FFmpeg production export:** GATED / NOT AUTHORIZED.
- **Production package and public distribution:** NO-GO.
- **Working, main, Draft PR #14:** no modification or merge authorized.

**Next practical checkpoint:** C3.4-G — a controlled, *non-distributable* source-package staging plan and verification checklist, or obtain a legal/compliance reviewer disposition first. Do not confuse packet completion with reviewer approval.
