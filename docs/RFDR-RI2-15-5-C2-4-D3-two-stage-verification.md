# RI2.15.5-C2.4-D3 — Two-stage signed application verification

**Status:** implementation committed; local manual acceptance pending.

This read-only verifier first compares each C2.2 staged binary to its approved B3 SHA-256. It then independently checks the signed, unpacked application: architecture, valid code signatures, allowed Mach-O dynamic library references, four original license notices, internal-only staging status, Electron executable architecture, whole-app signature, and FFmpeg version execution. It prints the signed hashes separately as **evidence**, not as new B3 approvals.

Run from repository root on macOS:

```sh
git checkout RFDR-RI2-Production-Readiness
git pull --ff-only origin RFDR-RI2-Production-Readiness
node scripts/ri2-verify-signed-two-stage.mjs arm64 ~/Projects/RI2-15-C2-ARM64-STAGED "release/ri2-c23-arm64/mac-arm64/IInnovent Professional Storyboard.app"
node scripts/ri2-verify-signed-two-stage.mjs x64 ~/Projects/RI2-15-C2-INTEL-STAGED "release/ri2-c23-x64/mac/IInnovent Professional Storyboard.app"
```

**Expected:** `RI2.15.5-C2.4-D3 TWO-STAGE PASS` for each architecture. On an Apple Silicon host, the x64 FFmpeg execution check requires working Rosetta; a failed run must not be bypassed.

A failure of `codesign --verify --deep --strict` may indicate that app-level signing or nested-code signing needs review; do not relax the check or modify the packaged files without approval.

This is an internal diagnostic, **not** production export enablement, notarization, corresponding-source compliance, or distribution authorization. No changes to Working, main, or Draft PR #14.
