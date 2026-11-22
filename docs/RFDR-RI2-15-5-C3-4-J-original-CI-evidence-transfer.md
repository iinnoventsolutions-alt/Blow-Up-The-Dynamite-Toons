# RI2.15.5-C3.4-J — Original CI evidence transfer into local source review package

**Status: EVIDENCE ARTIFACTS CONFIRMED AVAILABLE; LOCAL TRANSFER AWAITING USER EXECUTION. C3.4 OPEN / DISTRIBUTION NO-GO.**

## Confirmed live GitHub evidence

Original run `44661662574` currently reports two unexpired artifacts:
- ARM64 artifact `14594904533`, `RFDR-RI2-14-1-evidence-arm64-44661662574`
- Intel artifact `14596167258`, `RFDR-RI2-14-1-evidence-x64-44661662574`

## Transfer procedure

Use `gh run download 44661662574 --repo iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons --name <exact artifact name> --dir <review/evidence/arch>` to transfer evidence into dedicated `evidence/original-ci/arm64` and `evidence/original-ci/x64` folders within `~/Projects/RI2-C34H-Source-Review`. The user must have GitHub CLI authenticated and repository access. Do not download into, or modify, accepted runtime directories.

After transfer:
- Identify and retain `buildconf.txt`, `configure.log`, `ffmpeg-source-sha.txt`, `PROVENANCE.txt`, `binary-sha256.txt`, `ri2-7-relocated-links.txt` and any related source/build/linkage evidence actually present; **do not assume every named file exists**.
- Compute a checksum manifest of copied evidence and validate it; preserve original file bytes and architecture provenance.
- Compare FFmpeg commit, flags, dependency versions and relocation evidence against C3.4-I; record any gaps rather than filling them by inference.

**Acceptance:** both artifact downloads succeed; `find` lists evidence; evidence SHA-256 manifest verifies; original sources remain untouched. Evidence-transfer success is **not** corresponding-source or legal approval.

**Restrictions:** do not rebuild or modify binaries, Working, main, Draft PR #14, export gates, or release. **Distribution NO-GO.**
