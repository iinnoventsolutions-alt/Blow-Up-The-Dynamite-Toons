# RI2.15.5-C3.4-I — Original CI build evidence and source package completeness reconciliation

**Status: EVIDENCE RECONCILIATION COMPLETE / PARTIAL SOURCE PACKAGE / C3.4 OPEN / DISTRIBUTION NO-GO.**

## Evidence directly reviewed

- `docs/RFDR-RI2-15-5-C3-4-H-manual-source-staging-acceptance.md`: user-confirmed fail-fast local staging PASS, source manifest verified; no uploaded package/manifest independently inspected.
- `docs/RFDR-RI2-15-2-B-binary-license-verification.md`: original two-architecture CI build flags, linked dylibs and relocation distinction.
- `docs/RFDR-RI2-15-5-C3-3-original-build-provenance.md`: original run/jobs, source commit, brew installation, architecture-specific versions, build commands.
- `release-audit/ri2-4-minimal-ffmpeg-candidate.json`: required/forbidden flags. Its `proposed-only-not-built` status is historical, superseded by original CI build evidence.
- `docs/RFDR-RI2-15-5-C3-3-D-historical-formula-reconciliation.md`: formula snapshot candidates; exact installed bottle identity unresolved.

## Architecture-to-source reconciliation

| Input | ARM64 Sequoia | Intel Sonoma | Staged evidence | Disposition |
|---|---|---|---|---|
| FFmpeg | n7.1.1, Git `db69d06eeeab4f46da15030a80d539efb4503ca8` | Same | C3.4-H local clone HEAD verified | SOURCE IDENTITY PASS |
| libvpx | 1.17.0 | 1.16.0 | C3.4-H copied and rehashed both upstream tarballs | SOURCE ARCHIVE INTEGRITY PASS |
| Opus | 1.6.1 | 1.6.1 | C3.4-H copied and rehashed tarball | SOURCE ARCHIVE INTEGRITY PASS |
| Original build recipes | FFmpeg configure and make; Homebrew codec bottles | Same, architecture-dependent versions | Original CI reports; recipe/config files not yet staged in local source package | PARTIAL |
| Installed codec bottle and patch lineage | Unknown exact formula/bottle revision | Unknown exact formula/bottle revision | Historical formula snapshots only | OPEN EXCEPTION |

## Recovered original build outline (not a tested recipient build recipe)

1. Original repository checkout `fee3226355ffe13863066c35c2eabc962e229e37`.
2. CI installed `pkg-config libvpx opus nasm age` via Homebrew.
3. CI cloned FFmpeg n7.1.1, verified source Git SHA.
4. Configure flags: `--disable-doc --disable-everything --disable-xlib --enable-ffmpeg --enable-protocol=file --enable-protocol=pipe --enable-demuxer=rawvideo --enable-decoder=rawvideo --enable-decoder=pcm_f32le --enable-demuxer=pcm_f32le --enable-muxer=webm --enable-encoder=libvpx_vp8 --enable-encoder=libopus --enable-filter=aresample --enable-filter=scale --enable-libvpx --enable-libopus`.
5. Build: `make -C ffmpeg-src -j 4 ffmpeg`.
6. Original pre-relocation `otool -L` referenced Homebrew library locations; CI later generated relocated-link evidence. Final staged binaries must be assessed using final relocated links, not pre-relocation report.

This outline does **not** establish compiler/SDK/OS package pinning, Homebrew bottle reproduction, all build-time patches or complete relocation commands. Do not claim reproducible output from this outline.

## Completeness gap matrix

| Required material | Evidence status | Next action |
|---|---|---|
| Pinned FFmpeg source and three codec archives | PASS (user-reported C3.4-H staging) | Retain review-only; no redundant source download |
| Exact original architecture-specific `buildconf.txt` and `configure.log` | EXIST IN CI evidence; not in staged package | Copy/reconcile without editing; retain per-architecture filenames |
| Exact source checkout and build script | Original CI commit and commands IDENTIFIED | Extract relevant script at original checkout and document paths |
| Compiler, SDK, Homebrew versions and environment | NOT FULLY PINNED | Extract from original logs if available; otherwise flag as unknown |
| Codec formula/bottle digest, patches and recipe | PARTIAL, C3.3-E documented exception | Reviewer written disposition; do not infer candidate identity |
| Relocation/linkage instructions | CI relocation evidence exists | Capture exact commands and post-relocation dependency closure |
| License/notice package and LGPL review | Notices exist; completeness not signed off | Stage version-labeled notices and obtain legal review |
| Recipient source access, retention and release permissions | NOT APPROVED | Release owner/legal decisions |

## Checkpoint decision

**C3.4-I reconciliation: PASS (documentation-only). Source-package completeness: PARTIAL / NOT APPROVED.** The remaining engineering task is a narrow evidence-transfer checkpoint, not new architecture testing or a runtime rebuild.

**Recommended C3.4-J:** stage/copy the original CI `buildconf.txt`, `configure.log`, source provenance and relocated-link evidence for each architecture into the *internal review folder*, preserving exact contents and documenting missing fields. Do not attempt to manufacture historical Homebrew identities.

**Restrictions:** no modifications to `Working`, `main`, Draft PR #14, runtime binaries, export gates, or release. **Distribution NO-GO.**
