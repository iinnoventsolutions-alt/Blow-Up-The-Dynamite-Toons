# RI2.15.5-C2.2 — Architecture-specific verified runtime staging

**Status: implemented; execution and positive staging acceptance pending.** Branch `RFDR-RI2-Production-Readiness`.

Added:
- `release-audit/ri2-15-5-b3-approved-hashes.json`: approved six checksums from original RI2.14.1 CI manifests and B3 reconciliation.
- `scripts/ri2-stage-private-installer-runtime.mjs`: accepts architecture, trusted extracted runtime root, and a **new** destination; checks exact three hashes, validates notice presence, stages into `ffmpeg-runtime/bin`, `ffmpeg-runtime/lib` and `third-party-licenses`, and writes an internal-test-only status note. Refuses preexisting destinations and overlapping paths. No automatic DMG build or distribution.
- `tests/ri2-15-5-c2-2-staging.mjs`: negative test for wrong checksums, invalid architecture, and source/destination overlap.

## Acceptance steps

```sh
cd ~/Projects/Blow-Up-The-Dynamite-Toons
git checkout RFDR-RI2-Production-Readiness
git pull --ff-only origin RFDR-RI2-Production-Readiness
node tests/ri2-15-5-c2-2-staging.mjs
node scripts/check-ri2-license-inventory.mjs
```

Expected: `RI2.15.5-C2.2 fail-closed staging negative tests PASS` and existing inventory check PASS. For **positive** staging, run against the verified extracted runtime directory, not the CI evidence-only directory:

```sh
node scripts/ri2-stage-private-installer-runtime.mjs arm64 ~/Projects/RI2-14-ARM64 ~/Projects/RI2-15-C2-ARM64-STAGED
node scripts/ri2-stage-private-installer-runtime.mjs x64 ~/Projects/RI2-14-INTEL ~/Projects/RI2-15-C2-INTEL-STAGED
```

Both output destinations must not exist beforehand. Report the output or any failure. This does not create or authorize distribution of a DMG.

## Remaining gates

- Electron-builder `extraResources` architecture-specific installer integration and packaged hash verification
- macOS `lipo`/signature/dependency inspection of staged and final app files
- actual app/DMG notice placement and corresponding-source/build information compliance
- reviewed activation of trusted production WebM export, without test-marker bypass
- full packaged app tests on native ARM64 and Intel Macs

No modifications to Working, main, or Draft PR #14; no merge, release, or private distribution authorized.
