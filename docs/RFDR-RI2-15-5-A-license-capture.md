# RI2.15.5-A — Exact binary license evidence capture

**Status: IN PROGRESS.** Prior CI (run 44661662574) confirms both architecture builds, expected flags, and linked codec dylibs. Exact binary `ffmpeg -L` output remains missing; legal/redistribution approval is not granted.

## Safe collection procedure

Use the already-tested, privately held **relocated** FFmpeg runtime. On an authorized Mac, for each ARM64 and Intel bundle separately:

```sh
sh scripts/ri2-capture-ffmpeg-license-evidence.sh /absolute/path/to/ARM64-runtime /absolute/path/to/ARM64-license-evidence
sh scripts/ri2-capture-ffmpeg-license-evidence.sh /absolute/path/to/Intel-runtime /absolute/path/to/Intel-license-evidence
```

Both output directories must not exist before running. The command records `ffmpeg -L`, `-version`, `-buildconf`, `otool -L`, architecture and SHA-256 hashes. The script rejects GPL/nonfree/version3 flags and missing expected codec enablement, but **does not independently prove redistribution compliance**. Use the same original test bundles and compare hashes to archived RI2.14.1 manifests. Record exact machine architecture and test date.

**Review criteria:** verify FFmpeg's declared license, unexpected flags, linked dependencies, modified source status, and notices. The precise libvpx 1.16.0 and opus 1.6.1 upstream license texts are stored under `release-audit/licenses/`. Determine the corresponding-source delivery method, required FFmpeg attribution and any additional LGPL obligations with an appropriate reviewer. Do not commit private test bundles, keys or sensitive host information.

**Release blockers:** binary-license evidence review, exact source/notice delivery design, final package notice placement and integrity verification, private installation/security acceptance, and explicit authorization.

**Restrictions:** Signing/notarization conditionally deferred only for private team/invited tester distribution. No public distribution, production FFmpeg activation, merge, release, or changes to Working/main/Draft PR #14.
