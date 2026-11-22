# RI2.15.5-C3.4-K — Local CI evidence inventory and cross-architecture comparison

**Status: PROCEDURE READY / USER EXECUTION PENDING. Compliance OPEN. Distribution NO-GO.**

## Inputs

C3.4-J user-confirmed transferred CI artifacts from original GitHub Actions run `44661662574` under `~/Projects/RI2-C34H-Source-Review/evidence/original-ci/{arm64,x64}`. Their source content has **not** been independently opened by the assistant; do not assert that specific filenames exist until inventoried.

## Read-only procedure

Run the local Python 3 inventory script provided in the conversation. It searches each architecture directory recursively, computes file SHA-256, lists basename/relative path/size, extracts source commit matches and configure flag tokens from text files, and records missing/ambiguous evidence categories. It writes a report only to the review directory root, without editing downloaded evidence.

## Acceptance

- Both architecture folders contain files.
- The report records actual file paths, checksums, candidate evidence names and any missing categories.
- Source commit and configure flag comparisons are grounded in actual extracted text, with nonmatches/missing fields reported as UNKNOWN, not assumed.
- A final `C3.4-K EVIDENCE INVENTORY: PASS` line means inventory execution passed, **not** that build completeness or compliance passed.

## Next disposition

After user provides the report or summary, record which evidence is present and which gaps remain. Do not declare completeness based only on a script success marker.

No Working/main/Draft PR #14 changes, rebuild, export activation, or distribution. **NO-GO.**
