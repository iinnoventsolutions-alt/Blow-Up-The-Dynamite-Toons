# RI2.15.5-B2 — Consolidated dual-architecture runtime audit

**Status:** Audit script committed; execution and acceptance **PENDING**. Private team/invited testers only. This does not certify a final .app or DMG.

## Run on a Mac with both relocated runtimes

```sh
git fetch origin
git switch RFDR-RI2-Production-Readiness
git pull --ff-only origin RFDR-RI2-Production-Readiness
node scripts/ri2-audit-dual-runtime.mjs \
  /absolute/path/to/ARM64-runtime \
  /absolute/path/to/Intel-runtime
```

Each runtime root must contain exactly `bin/ffmpeg`, `lib/libvpx.12.dylib`, `lib/libopus.0.dylib` within its `bin/` and `lib/` folders. **Do not pass the same repository root twice**: use distinct architecture-specific runtime roots. The command is read-only, prints a combined JSON report, and exits nonzero on failure. It checks architectures of **all three files**, SHA-256 hashes, direct and transitive linked-library references, missing or unexpected dependencies and code signature validity. System library paths are allowed; unresolved `@rpath`, Homebrew paths, or dependencies outside the staged runtime fail.

For comparison against previously approved CI binaries, supply a **trusted, independently verified** JSON manifest as an optional third argument:

```json
{
  "arm64": {
    "bin/ffmpeg": "<64-character SHA-256>",
    "lib/libvpx.12.dylib": "<64-character SHA-256>",
    "lib/libopus.0.dylib": "<64-character SHA-256>"
  },
  "x86_64": {
    "bin/ffmpeg": "<64-character SHA-256>",
    "lib/libvpx.12.dylib": "<64-character SHA-256>",
    "lib/libopus.0.dylib": "<64-character SHA-256>"
  }
}
```

Replace placeholders with hashes from the original authenticated RI2.14.1 artifacts, **not hashes copied from the current files**. Without a trusted manifest, hash calculation is informational only and authenticity remains OPEN.

## Acceptance

- [ ] Both runtime results have zero errors, expected architecture for executable and both dylibs, and verified relative library closure.
- [ ] Both runtime signatures verify, and hashes match authenticated baseline evidence.
- [ ] Exact FFmpeg license/build configuration evidence reconciled with the audited binaries.
- [ ] Final .app/DMG independently inspected for packaged FFmpeg, licenses, notices, source-access information, secrets, binary architecture, hash manifest and app security.
- [ ] Native ARM64 and Intel private-installer acceptance completed.
- [ ] Explicit user approval obtained before any distribution.

**Scope warning:** Passing this script does not inspect Electron IPC, dependency vulnerabilities, malware, the DMG, or LGPL source-delivery compliance. The final package-security gate stays OPEN.

Protected: Working, main, Draft PR #14. No merges, production FFmpeg activation, public/private release, signing or notarization authorized.
