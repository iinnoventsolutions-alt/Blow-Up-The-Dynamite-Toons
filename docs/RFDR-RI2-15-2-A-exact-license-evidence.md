# RI2.15.2-A — Exact-tag licensing collection and outstanding gates

Status: **source-license collection PASS; redistribution compliance NOT approved**.

## Exact-version upstream license files preserved

| Component | Source revision | Repository copy | Upstream Git blob SHA |
| --- | --- | --- | --- |
| FFmpeg | n7.1.1 (source commit db69d06eeeab4f46da15030a80d539efb4503ca8) | release-audit/licenses/FFmpeg-n7.1.1-LICENSE.md | 613070e1b631a919a74c862f2a75a0f249a631ff |
| FFmpeg | n7.1.1 | release-audit/licenses/FFmpeg-n7.1.1-COPYING.LGPLv2.1 | 58af0d3787aec7d6f8d833535d64879156e7ec23 |
| libvpx | v1.16.0 | release-audit/licenses/libvpx-v1.16.0-LICENSE | 1ce44343c4a325e9e1189fd98bb44a9f2f096da9 |
| opus | v1.6.1 | release-audit/licenses/opus-v1.6.1-COPYING | 75711467a3eb220f35f72afdb55a4734ee5cdb47 |

All four contents were fetched from upstream GitHub repositories at the exact specified tags and committed verbatim. Source references:
- https://github.com/FFmpeg/FFmpeg/blob/n7.1.1/LICENSE.md
- https://github.com/FFmpeg/FFmpeg/blob/n7.1.1/COPYING.LGPLv2.1
- https://github.com/webmproject/libvpx/blob/v1.16.0/LICENSE
- https://github.com/xiph/opus/blob/v1.6.1/COPYING

## Licensing analysis (preliminary, not legal signoff)

FFmpeg n7.1.1 LICENSE.md describes the default as LGPL-2.1-or-later, with GPL and nonfree configuration changing the distribution analysis. The repository's minimal candidate flags exclude `--enable-gpl`, `--enable-version3`, and `--enable-nonfree`; this does **not** establish that every distributed binary is LGPL-only. The actual compiled binary and complete linkage must be checked.

The libvpx and opus source licenses require preserving copyright, conditions, and disclaimer with binary distributions. Opus COPYING also points to relevant royalty-free patent-license declarations.

FFmpeg's official legal checklist (https://ffmpeg.org/legal.html) recommends corresponding source distribution, exact build configuration, clear attribution, and LGPL-compatible license terms. The project currently builds a standalone FFmpeg executable with dynamically linked external libvpx/opus dylibs; this is not identical to embedding/linking FFmpeg libraries into the Electron application. Review the exact executable packaging and LGPL obligations accordingly.

## Next verification gate (RI2.15.2-B)

- [ ] Obtain and inspect **both architectures'** exact `ffmpeg -L`, `ffmpeg -buildconf`, `ffmpeg -version`, and `otool -L` outputs from the already-tested artifacts or retained text evidence.
- [ ] Confirm whether any source modifications occurred, and record build commands, exact sources, dependency provenance, checksums, and corresponding-source delivery method.
- [ ] Confirm license notice placement in actual production installer/app and document the source-access URL/offer before release.
- [ ] Add a fail-closed automated notice/provenance validation test and run CI.
- [ ] Obtain legal/compliance approval before enabling production distribution.

No production FFmpeg distribution, signing, notarization, branch merge, Draft PR #14 change, or release is authorized.
