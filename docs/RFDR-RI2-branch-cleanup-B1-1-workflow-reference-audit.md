# RFDR Branch Cleanup B1.1 — Workflow reference audit and revised deletion scope

**Status: READ-ONLY WORKFLOW AUDIT COMPLETE. NO BRANCHES DELETED.**

## Trigger

Owner's `git grep` on `origin/Working -- .github/workflows` found historical branch references for four of the seven planned B1 deletions. The seven workflow files listed below were inspected directly from `Working`.

## Findings

- `PT1-Validated-Review-20261023`, `Performance-Tuning`, and `RFU4-RA`: no references in the **reported** workflow grep results; each has zero commits ahead of both `Working` and `RFDR-RI2-Production-Readiness`. These are **conditional deletion candidates**, not proof that all other branches/tags, automation, scripts or deployments are free of references.
- `RFDR-C3.5-Onion-Skin-Resolution`: push triggers in `rfdr-integration-validation.yml` and `rfdr-ri1-3-preservation-baseline.yml`. HOLD for explicit workflow retirement.
- `RFDR-Integration-Testing`: push triggers in `rfdr-c2-arm64-manual-acceptance.yml`, `rfdr-integration-validation.yml`, and `rfdr-ri1-3-preservation-baseline.yml`; `rfdr-c2-arm64-manual-acceptance.yml` also has `if: github.ref == 'refs/heads/RFDR-Integration-Testing'`. HOLD for workflow retirement.
- `Release-Defect-Resolution`: push trigger in `electron-builder-security-trial.yml`; `rdr-promote-minimatch-candidate.yml` triggers on this branch and **pushes back to `HEAD:Release-Defect-Resolution`**. HOLD; remove explicit push target only by separately approved workflow change.
- `Security-Audit-W`: push triggers in `electron-builder-security-trial.yml`, `sa1-dependency-audit.yml`, and `sa1-dependency-remediation.yml`; the scheduled audit on default branch may remain useful even if obsolete branch trigger is retired. HOLD pending workflow-retirement design.

## Open PR safety

Owner's complete `gh api -X GET .../pulls?state=open --paginate` output: #14 `RFDR-Animatic -> Working`, #10 `RB0-Camera-Control-RFU -> Working`, #7 `dependabot/npm_and_yarn/npm_and_yarn-03e5534014 -> main`. Protect all three PR source refs. No B1 candidate among them.

## Next steps (no automatic deletion)

1. Reconfirm other workflow/default, `Release`, and production-readiness refs, scheduled jobs, scripts, and tags before any deletion.
2. Seek explicit owner approval for a **three-branch deletion batch** containing `PT1-Validated-Review-20261023`, `Performance-Tuning`, and `RFU4-RA`.
3. Plan isolated workflow-retirement changes for the four held branches, with no modifications to `Working`, `main`, `Release` or open PRs absent separate authorization.
4. Before actual deletion re-check branch SHA, ancestry and protection status; log SHA and verification.

## Source of verification

Inspected `Working` workflow files:
- `.github/workflows/electron-builder-security-trial.yml`
- `.github/workflows/rdr-promote-minimatch-candidate.yml`
- `.github/workflows/rfdr-c2-arm64-manual-acceptance.yml`
- `.github/workflows/rfdr-integration-validation.yml`
- `.github/workflows/rfdr-ri1-3-preservation-baseline.yml`
- `.github/workflows/sa1-dependency-audit.yml`
- `.github/workflows/sa1-dependency-remediation.yml`

**No branches deleted or release gates altered.**
