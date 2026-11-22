# Branch Cleanup B1 — Seven-branch deletion manifest and pre-deletion safeguards

**Status: READ-ONLY AUDIT COMPLETE; DELETION NOT AUTHORIZED OR EXECUTED.**

## Retention

Protect `main` (default), `Release`, `Working`, `RFDR-RI2-Production-Readiness` (latest readiness), `RFDR-A1.5-D4.6.5-WebM-Muxing-Prototype` (unique WebM history), `RB0-Camera-Control-RFU` (unique camera history), and `RFDR-RI1-Controlled-Integration` (temporary integration reference). Do not create R1.2 implementation branch during cleanup.

## Proposed deletion batch B1

GitHub compare `base...head` results: **all seven have ahead_by=0 relative to both Working and RFDR-RI2-Production-Readiness**, hence their commit tips are reachable from both baselines. Counts are **ahead/behind**.

| Branch | vs Working | vs production-readiness | Proposed disposition |
|---|---:|---:|---|
| `PT1-Validated-Review-20261023` | 0 / 372 | 0 / 490 | DELETE after checks |
| `Performance-Tuning` | 0 / 372 | 0 / 490 | DELETE after checks |
| `RFDR-C3.5-Onion-Skin-Resolution` | 0 / 29 | 0 / 147 | DELETE after checks |
| `RFDR-Integration-Testing` | 0 / 41 | 0 / 159 | DELETE after checks |
| `RFU4-RA` | 0 / 60 | 0 / 178 | DELETE after checks |
| `Release-Defect-Resolution` | 0 / 144 | 0 / 262 | DELETE after checks |
| `Security-Audit-W` | 0 / 235 | 0 / 353 | DELETE after checks |

This establishes commit ancestry, **not** PR safety, branch protection state, automation dependencies, or whether historical tags/workflows link by branch name.

## Draft PR #14

GitHub issue/PR #14 fetched directly: **OPEN**; title `RFDR-Animatic: restore Electron animatic export and retain regression gates`. PR description states **DRAFT FOR REVIEW ONLY**, explicit merge approval required; `main` untouched. The issue record did not expose the PR's head/base refs, so **PR head/base verification is still required**. Do not close, retarget, merge or otherwise modify PR #14.

## Required final pre-delete checks

1. Retrieve current branch tip SHA for each B1 candidate and the retention baselines; re-run ancestry checks to avoid stale comparisons.
2. Inspect **all open PRs**, especially #14, for exact head/base refs; remove any referenced branch from deletion manifest.
3. Check branch protection/rulesets, default branch, release workflows, tags, and external automation references. Keep branches needed by release automation or evidence traceability.
4. Obtain **explicit approval to delete the final named list**. This document is not approval.
5. Delete only approved remote branch refs, one at a time, logging branch name, former tip SHA, result and date. Do not delete tags or Actions artifacts. Stop on unexpected state.
6. Re-list branches, verify all seven retention branches remain, verify Draft PR #14 remains open and unchanged, and confirm `Working`, `Release`, `main`, and production-readiness tips unchanged.

## Next batch

Remaining 18 cleanup candidates have unique commits relative to `Working` and need individual preservation/PR assessment; **no deletion proposed yet**.

**Current outcome: 7 strong candidates, 0 deletions, protected refs unchanged.**
