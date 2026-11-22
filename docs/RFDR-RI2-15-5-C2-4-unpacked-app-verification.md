# RI2.15.5-C2.4 — Unpacked Electron application verification

**Status:** verifier committed; local macOS execution pending. No installer/DMG distribution authorized.

## Build isolated unpacked apps locally

Use previously generated configuration files `/tmp/ri2-c23-arm64.json` and `/tmp/ri2-c23-intel.json`, each derived from the verified staged runtime. Run from repository root:

```sh
git checkout RFDR-RI2-Production-Readiness
git pull --ff-only origin RFDR-RI2-Production-Readiness
npm run build
npx electron-builder --mac --arm64 --dir --config /tmp/ri2-c23-arm64.json
npx electron-builder --mac --x64 --dir --config /tmp/ri2-c23-intel.json
```

The config files set separate output directories `release/ri2-c23-arm64` and `release/ri2-c23-x64`. Find the actual .app path under each directory, then run:

```sh
node scripts/ri2-verify-unpacked-app.mjs arm64 "release/ri2-c23-arm64/mac-arm64/IInnovent Professional Storyboard.app"
node scripts/ri2-verify-unpacked-app.mjs x64 "release/ri2-c23-x64/mac/IInnovent Professional Storyboard.app"
```

If the builder chooses different output subfolders, use the actual app path returned by `find release/ri2-c23-arm64 release/ri2-c23-x64 -name '*.app' -maxdepth 3`. The verifier is read-only and rejects incorrect hashes, architectures, missing notices, unexpected dependency paths, invalid signatures and absent internal-test status.

**Potential macOS packaging issue:** Electron-builder ad-hoc signing may alter embedded binaries or reject their signature. If so, stop and report the exact failure; do not re-sign the FFmpeg files or bypass checksum verification without a separately reviewed update.

**Remaining gates:** actual app acceptance, WebM export activation review, corresponding-source obligations, and private distribution authorization. Do not share installer or DMG. Do not modify Working, main, or Draft PR #14.
