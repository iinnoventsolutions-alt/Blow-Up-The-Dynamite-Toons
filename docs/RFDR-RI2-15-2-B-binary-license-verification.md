# RI2.15.2-B — Binary-specific licensing evidence review

Status: **technical configuration verified for both architectures; legal distribution approval OPEN**.

Source: GitHub Actions run 44661662574, ARM64 evidence artifact 14594904533 and x64 evidence artifact 14596167258. Both evidence ZIP archives were downloaded and inspected (27 text evidence files each). CI jobs completed successfully.

## Verified results

| Test | ARM64 | x64 |
| --- | --- | --- |
| FFmpeg version | n7.1.1 | n7.1.1 |
| Build configuration | Matches minimal candidate | Matches minimal candidate |
| --enable-gpl | ABSENT | ABSENT |
| --enable-version3 | ABSENT | ABSENT |
| --enable-nonfree | ABSENT | ABSENT |
| libvpx and libopus | Enabled | Enabled |
| Direct external codec dylibs | libvpx.12, libopus.0 | libvpx.12, libopus.0 |
| WebM smoke, isolation and relocation | CI PASS | CI PASS |

Exact shared configuration: `--disable-doc --disable-everything --disable-xlib --enable-ffmpeg --enable-protocol=file --enable-protocol=pipe --enable-demuxer=rawvideo --enable-decoder=rawvideo --enable-decoder=pcm_f32le --enable-demuxer=pcm_f32le --enable-muxer=webm --enable-encoder=libvpx_vp8 --enable-encoder=libopus --enable-filter=aresample --enable-filter=scale --enable-libvpx --enable-libopus`.

The evidence `otool-L.txt` reflects the **pre-relocation** compiled executable, referencing Homebrew library locations. CI separately passed relocation checks and produced `ri2-7-relocated-links.txt`; production artifact validation must use the final staged binary and libraries.

## Open compliance questions

1. Neither evidence ZIP contains a captured `ffmpeg -L` output. The absence of GPL/version3/nonfree flags strongly supports an LGPL-default configuration but is not a substitute for binary-specific license output or legal assessment.
2. Validate the exact license/notice files and source origin of Homebrew libvpx 1.16.0 and opus 1.6.1 for **both** architectures, with corresponding source delivery and checksums.
3. Verify all FFmpeg source copyright/notice obligations, modified source status, source distribution mechanism, and executable packaging/installation details.
4. Ensure the notices are accessible in the actual production app package; add automated fail-closed checks and review signing/notarization only after compliance gates.

## Security/release restrictions

Internal encrypted test bundles only. No production FFmpeg distribution, branch merge, changes to Working/main/PR #14, signing, notarization, or release is authorized. This review is not legal advice or distribution approval.
