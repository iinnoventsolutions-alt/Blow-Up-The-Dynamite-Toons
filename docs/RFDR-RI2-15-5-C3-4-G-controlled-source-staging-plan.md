# RI2.15.5-C3.4-G — Controlled non-distributable source-package staging plan

**Status: STAGING PLAN READY; PACKAGE NOT BUILT; COMPLIANCE OPEN; DISTRIBUTION NO-GO.**

## Scope and containment

Prepare a **local, review-only** source package under a dedicated audit directory, never inside the Electron app, release installer, or GitHub release assets. This checkpoint is planning/documentation only: no downloads, packaging, binary modifications, source publication, or export activation performed.

- Work only on `RFDR-RI2-Production-Readiness`; do not modify `Working`, `main`, or Draft PR #14.
- Preserve accepted staged ARM64 and Intel runtimes unchanged.
- Mark every proposed archive and README `INTERNAL COMPLIANCE REVIEW — NOT FOR DISTRIBUTION` until approved.
- Do not publish source bundles or interpret staging as license compliance.

## Planned staging inputs and evidence gates

| Input | Proposed package location | Verification before acceptance |
|---|---|---|
| FFmpeg n7.1.1 | `sources/ffmpeg/` | Git commit exactly `db69d06eeeab4f46da15030a80d539efb4503ca8`; preserve upstream license and file-level notices; document archive digest |
| libvpx 1.17.0 | `sources/libvpx/libvpx-1.17.0.tar.gz` | Copy from user Mac C3.4-D audit folder; SHA-256 `1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a` |
| libvpx 1.16.0 | `sources/libvpx/libvpx-1.16.0.tar.gz` | Copy from user Mac; SHA-256 `7a479a3c66b9f5d5542a4c6a1b7d3768a983b1e5c14c60a9396edc9b649e015c` |
| Opus 1.6.1 | `sources/opus/opus-1.6.1.tar.gz` | Copy from user Mac; SHA-256 `6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1` |
| Original FFmpeg configure evidence | `build/ffmpeg-configure-{arm64,x64}.txt` | Copy exact original CI `buildconf.txt` for each architecture; compare with C3.2 flags |
| Build instructions | `build/ffmpeg-build.md`, `build/codecs-{arm64,x64}.md`, `build/relocation-and-linking.md` | Label historical unknowns; never claim exact Homebrew formula/bottle/patch reproduction |
| Licenses | `licenses/` | Include full FFmpeg LGPL text and FFmpeg overview; separately label libvpx v1.16.0 and v1.17.0 notices; include Opus COPYING; check upstream notices and any additional linked dependencies |
| Package metadata | `README-SOURCE.md`, `SHA256SUMS`, `MANIFEST.md`, `OPEN-ISSUES.md` | Record origin, architecture map, actual hashes, unresolved provenance, reviewer-only status and no distribution authorization |

## Fail-closed review checklist

- [ ] All three codec archives are present in staging and `shasum -a 256` matches expected values **again after copying**.
- [ ] FFmpeg source Git commit is verified and staged source archive digest recorded.
- [ ] Exact original CI configure logs and build configuration are attached for both architectures.
- [ ] Codec build recipes, patches and installed-bottle identity are either substantiated or explicitly flagged for reviewer disposition.
- [ ] License files, copyright notices, linked-library inventory, and LGPL replacement/relinking questions are independently reviewed.
- [ ] Package manifest lists every staged file and digest; no executable/runtime binaries accidentally included.
- [ ] Source delivery, retention, legal approval, and production packaging remain blocked until separate decisions.

## Proposed execution sequence (requires separate authorization)

1. Stage source inputs and evidence in a dedicated local audit folder; do not move originals.
2. Compute checksums and create a manifest; inspect for missing or unintended files.
3. Draft architecture-specific build/relocation notes with exact CI evidence, keeping unknowns explicit.
4. Produce an internal review summary and send to qualified compliance/legal reviewer.
5. Only after written dispositions, separately seek permission for any production package change or release.

## Decision

**C3.4-G planning: PASS. Source-package assembly: NOT STARTED. C3.4 compliance: OPEN. Release: NO-GO.**

Next checkpoint, subject to explicit approval: **C3.4-H local source-package staging and integrity acceptance**. This is engineering work, not another application test; it must not affect accepted binaries, Working/main or Draft PR #14.
