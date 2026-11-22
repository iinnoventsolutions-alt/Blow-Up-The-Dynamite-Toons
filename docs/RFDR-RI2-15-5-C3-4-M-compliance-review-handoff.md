# RI2.15.5-C3.4-M — Compliance review handoff and remaining-gate disposition

**Status: REVIEW HANDOFF PREPARED; REVIEWER SIGNOFF NOT RECEIVED. C3.4 OPEN. DISTRIBUTION NO-GO.**

## Purpose and evidence baseline

This is an internal, non-distributable handoff for a qualified legal/compliance reviewer and release owner. It consolidates accepted engineering evidence, not a license determination or authorization to release.

- C3.4-H: user-confirmed local staging of pinned FFmpeg n7.1.1 Git commit `db69d06eeeab4f46da15030a80d539efb4503ca8`, libvpx 1.17.0/1.16.0 and Opus 1.6.1 source archives, with source hashes/manifest verified.
- C3.4-I: original CI build outline and gap reconciliation; source package was PARTIAL at that checkpoint.
- C3.4-J: user-confirmed original CI evidence transfer and local SHA-256 manifest verification for both architecture artifacts from run `44661662574`.
- C3.4-K: user-provided inventories list **27 evidence files per architecture**, all six requested categories present: `buildconf.txt`, `configure.log`, `ffmpeg-source-sha.txt`, `PROVENANCE.txt`, `binary-sha256.txt`, `ri2-7-relocated-links.txt`.
- C3.4-L: user-confirmed targeted content verification PASS: FFmpeg source commit string present, required configure flags present, no `--enable-gpl`, `--enable-nonfree`, `--enable-version3` in checked `buildconf.txt`; buildconf identical between architectures. This is a targeted script check, not a full audit of all log contents.
- Earlier C3.2/C3.3: staged binaries report LGPL v2.1-or-later; six runtime SHA-256 digests reconcile with original CI; ARM64 and native Intel technical acceptance previously passed.
- C3.3-E: historical exact Homebrew formula revision, bottle digest and patch lineage **unresolved**. Candidate historical formula/bottle records are **not** evidence of exact installed bottle identity.

## Decisions for reviewer and release owner

| Gate | Required explicit decision | Current disposition |
|---|---|---|
| L1 — LGPL | Determine exact obligations for FFmpeg executable and linked libvpx/Opus dylibs, including source, notices, replacement/relinking and debugging rights as applicable | OPEN — legal/compliance reviewer |
| L2 — Corresponding source/build materials | Decide whether staged FFmpeg/codec sources plus original CI evidence, build recipes, applicable patches, toolchain details and relocation instructions constitute sufficient recipient-facing source materials; request remediation where needed | OPEN — legal + build owner |
| L3 — Provenance exception | Accept or reject unresolved historical Homebrew formula/bottle/patch lineage in writing; if rejected, specify exact additional evidence needed | OPEN — compliance/release owner |
| L4 — Notices | Approve complete component-specific copyright/license notices, version labeling and actual distribution placement | OPEN — legal + release owner |
| L5 — Delivery | Approve source/notice access mechanism, retention, recipient instructions and contacts | OPEN — legal + release owner |
| R1 — Production export/build | Authorize packaging the runtime and lifting fail-closed export gate only after compliance approval and production validation | BLOCKED |
| R2 — macOS signing/release | Authorize Developer ID/notarization and release channel; current ad hoc signing is not distribution approval | BLOCKED |
| R3 — Integration | Explicit project-owner authorization before changing Working, main, or Draft PR #14 | BLOCKED |

## What is and is not complete

**Complete for technical handoff:** local source staging, original CI artifact transfer, 27-file inventory per architecture, six-category presence, targeted source/config content checks, prior binary integrity and native acceptance.

**Not established:** legally sufficient corresponding source package, full build reproducibility, exact historical Homebrew bottle/patch lineage, approved recipient notices and source delivery, license compliance certification, production export activation, notarization, or permission to ship.

## Recommended next checkpoint

**C3.4-N — Reviewer Decision Collection:** supply this packet and earlier C3.4-F to the designated legal/compliance reviewer and release owner. Record signed or attributable decisions for L1–L5 and explicit acceptance/rejection of L3 provenance exception; capture narrowly scoped remediation tasks for any rejected gate. Do not presume reviewer identity, send files externally without authorization, or manufacture approvals.

**No changes** to `Working`, `main`, Draft PR #14, runtimes, export gates or distribution. **NO-GO**.
