# RFDR B1.3 — Historical GitHub Actions Workflow Retirement Assessment

**Assessment only. No workflow edits, branch deletion, PR changes, or merges authorized.**

## Baseline
B1.2 closed with three branches deleted and 29 remaining. Open PR #14 `RFDR-Animatic -> Working`, PR #10 `RB0-Camera-Control-RFU -> Working`, PR #7 Dependabot -> `main` must remain intact. Seven named workflow files were read from `Working` and their presence confirmed on `RFDR-RI2-Production-Readiness`. The same named files were not found on `main`; the `Release` workflow directory could not be retrieved (404), which is not proof of absent automation elsewhere. Do not modify `Working`, `main`, or `Release`.

## Four branches held pending workflow retirement

### RFDR-C3.5-Onion-Skin-Resolution
- `rfdr-integration-validation.yml` and `rfdr-ri1-3-preservation-baseline.yml` have push triggers for this branch.
- Proposed retirement: remove only this historical push filter while retaining `Working` PR/push regression gates and applicable `workflow_dispatch`. Preserve tests.

### RFDR-Integration-Testing
- Push filters in `rfdr-c2-arm64-manual-acceptance.yml`, `rfdr-integration-validation.yml`, `rfdr-ri1-3-preservation-baseline.yml`.
- ARM64 acceptance job also checks `github.ref == 'refs/heads/RFDR-Integration-Testing'`; deleting branch without adjusting the condition would leave a manual workflow that does not run its job on other refs.
- Proposed retirement: archive/document the historical installer workflow or explicitly retarget its condition to a current acceptance branch only if the owner authorizes new validation scope. Retain regression coverage for `Working`.

### Release-Defect-Resolution
- `electron-builder-security-trial.yml` has a push trigger.
- `rdr-promote-minimatch-candidate.yml` triggers on pushes to this branch when the workflow file changes, and runs `git push origin HEAD:Release-Defect-Resolution`. This is a **write-enabled promotion path**.
- Proposed retirement: disable/remove the historical promotion workflow in a controlled branch; do not repoint its write operation to `Working` or `main`. Keep active security test coverage on `Working`.

### Security-Audit-W
- Push filters in `electron-builder-security-trial.yml`, `sa1-dependency-audit.yml`, `sa1-dependency-remediation.yml`.
- `sa1-dependency-audit.yml` also has a scheduled weekly audit; its `Working` trigger and scheduled audit should be preserved.
- `sa1-dependency-remediation.yml` reports proposed changes without pushing; keep useful security checks and remove only retired branch filter.

## Recommended isolated implementation sequence (requires separate approval)
1. Create an isolated workflow-retirement branch from `RFDR-RI2-Production-Readiness`, **not** from `Working` or `main`.
2. Change only named legacy triggers, the obsolete ARM64 job guard, and the historical write-enabled promotion workflow; preserve `Working` and PR gates, security audits and scheduled checks.
3. Validate YAML syntax, dispatch behavior, GitHub Actions checks, no new writes, and branch-name references on the isolated branch.
4. Separately authorize promotion of reviewed workflow changes to any protected or active branch. Merely changing the isolated branch does **not** retire triggers that still exist on `Working` or elsewhere.
5. After all relevant active workflow definitions are updated and verified, re-check open PRs, branch tips, protection, external automation and ancestry; obtain explicit named-list deletion approval before deleting the four held branches.

## Release security note
GitHub's remote output on B1.2 reported 12 Dependabot alerts on default branch (6 high, 4 moderate, 2 low); current alert details not assessed here. Resolve or disposition before production release.

**Status: B1.3 assessment complete; implementation and four branch deletions remain on HOLD.**
