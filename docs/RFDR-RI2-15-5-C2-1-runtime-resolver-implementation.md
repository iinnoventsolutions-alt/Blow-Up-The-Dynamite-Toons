# RI2.15.5-C2.1 — Isolated packaged runtime resolver

**Status: IMPLEMENTED; local/CI regression execution pending.** Branch: `RFDR-RI2-Production-Readiness`.

Changes:
- `desktop/isolated-ffmpeg.cjs` resolves `Contents/Resources/ffmpeg-runtime/bin/ffmpeg` with sibling `lib/libvpx.12.dylib` and `lib/libopus.0.dylib`. It verifies realpath containment and rejects externally symlinked runtime components.
- `tests/rfdr-n3-15-packaged-encoder.mjs` now exercises the nested layout, executable permissions, external binary/library symlinks, probe timeout and abort.

**Not yet implemented:** electron-builder architecture-specific `extraResources` staging; inclusion of notices/source-access instructions; reviewed production export activation; packaged application regression tests. The test harness and export activation remain gated as before. No production FFmpeg distribution or release is approved.

## Developer verification (on checkout of this branch)

```sh
git checkout RFDR-RI2-Production-Readiness
git pull --ff-only origin RFDR-RI2-Production-Readiness
node tests/rfdr-n3-15-packaged-encoder.mjs
```

Expected output: `RFDR N3.15 packaged encoder boundary PASS`. This checks the resolver with test fixtures, **not** actual macOS dylib linkage or DMG contents. Report any failures before further packaging changes.

Next: C2.2 design a fail-closed architecture-specific packaging stage using approved B3 SHA256 manifests, and ensure notices and source-access requirements are met before any private installer is distributed. Keep Working, main and Draft PR #14 unchanged.
