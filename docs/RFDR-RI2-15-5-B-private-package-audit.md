# RI2.15.5-B — Private package integrity and security audit

**Status: preparation complete; final package validation OPEN.** Private development-team/invited-tester distribution only. Signing and notarization are conditionally deferred, not passed. Do not disable Gatekeeper globally.

## Evidence already established

- RI2.14.4: 18/18 user-attested native clean-host runtime checks (ARM64 and Intel); not a final application-installer test.
- RI2.15.3: exact-version source-license inventory workflow PASS, run 44675561723.
- RI2.15.5-A: user-supplied ARM64.zip and Intel.zip contain FFmpeg LGPL-2.1-or-later `ffmpeg -L` output and identical minimal configurations without GPL/version3/nonfree flags. These ZIPs contain **only** license/buildconf text, not the runtime or final app package. They do not prove package contents, signature validity, or matching executable hashes.

## Stage 1: inspect private relocated runtime

On an authorized machine, run `node scripts/ri2-audit-private-runtime.mjs /absolute/path/to/runtime` for each architecture. Save the printed JSON privately. The command checks required regular files, disallows symlinks at required paths, and calculates SHA-256 hashes. Compare with the matching archived RI2.14.1 runtime SHA-256 manifests; a standalone hash is not an authenticity guarantee. For each architecture also collect `file`, `lipo -archs`, `otool -L`, `codesign --verify --verbose=2`, `ffmpeg -L`, `ffmpeg -buildconf`, and source/build provenance. The script does not run these commands or inspect transitive dependencies.

## Stage 2: final application package (not yet available for inspection)

- [ ] Generate and archive SHA-256 manifest for the final DMG, .app executable, all nested executables, FFmpeg and dependent dylibs.
- [ ] Compare embedded runtime bytes against audited architecture-specific runtime manifests and ensure `@executable_path`/`@loader_path` closure; no Homebrew absolute paths.
- [ ] Enumerate all bundled binaries, unexpected frameworks, executable permissions, symbolic links and external process entry points.
- [ ] Verify exact third-party license texts, attribution and corresponding-source access are shipped or delivered appropriately. **Current repository license inventory is not proof of inclusion in the .app/DMG.**
- [ ] Run dependency and Electron IPC/security regression scans; audit file access, shell/process execution, untrusted project import, path traversal and archive extraction.
- [ ] Confirm test-only secrets, encrypted bundles and private keys are absent from deliverables.
- [ ] Test clean ARM64 and Intel installation, first launch, Gatekeeper warning behavior, WebM export, reopen/update, uninstall and project-data preservation.
- [ ] Record machine/version, architecture, installer hash, test outcomes, reviewer and date.

## Gate decision

**NOT READY for private distribution.** The local runtime manifest script is a preparation step, not a complete package-security gate. A final built installer/app and matching provenance are needed for meaningful package verification. Licensing/source delivery and private installation acceptance remain open. Any distribution requires explicit authorization.

Protected: Working, main and Draft PR #14; no merges, production FFmpeg activation, signing/notarization or release.
