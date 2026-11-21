# RFDR B1.4 — Isolated Workflow Retirement Implementation

**Branch:** `RFDR-RI2-B1-4-Workflow-Retirement` (created from `RFDR-RI2-Production-Readiness`).

## Changes made (isolated branch only)

- Removed obsolete `Security-Audit-W` and `Release-Defect-Resolution` push filters from `electron-builder-security-trial.yml`; preserved `Working` push, PR and manual dispatch.
- Removed `RFDR-Integration-Testing` and `RFDR-C3.5-Onion-Skin-Resolution` push filters from `rfdr-integration-validation.yml` and `rfdr-ri1-3-preservation-baseline.yml`; preserved `Working` and `RFDR-RI1-Controlled-Integration` where applicable, PR and manual dispatch.
- Removed `Security-Audit-W` push filters from `sa1-dependency-audit.yml` and `sa1-dependency-remediation.yml`; preserved `Working`, manual dispatch and weekly scheduled audit.
- Removed the obsolete branch-specific `rfdr-c2-arm64-manual-acceptance.yml` workflow from this branch; historical file remains available in Git history. Do not mistake its removal for loss of existing prior CI artifacts.
- Removed `rdr-promote-minimatch-candidate.yml`, a historical `contents: write` workflow that explicitly pushed to `Release-Defect-Resolution`. Historical file remains in Git history. **No replacement write target** was introduced.

## Diff verification

GitHub compare against `RFDR-RI2-Production-Readiness` showed 7 commits ahead, 0 behind, and **only seven workflow files changed** (five modified, two deleted). No application code, package files, branch tips of `Working`, `main`, `Release`, or open PRs were intentionally modified.

## Required verification before promotion

1. Review YAML and GitHub Actions workflow validation on the isolated branch; verify `Working` and PR gates and security schedule remain intact.
2. Confirm no other workflow files, active branch-specific definitions, rulesets, deployment jobs or external automations require the four held branches.
3. Obtain separate explicit authorization before propagating any changes to `Working` or other active branches. An isolated-branch change **does not retire workflows on `Working`**.
4. Do not delete `RFDR-C3.5-Onion-Skin-Resolution`, `RFDR-Integration-Testing`, `Release-Defect-Resolution`, or `Security-Audit-W` until applicable workflows are retired across active refs and a new explicit deletion approval is obtained.

**Status:** Isolated changes implemented; automated CI validation and promotion pending. No additional branches deleted.
