# RFDR-A1.5 D4.6.5N1 — Muxer architecture selection

**Status:** architecture candidate selected for isolated feasibility gate; **no production dependency or exporter change approved**.

## Primary source review (2026-11-11)
- Vanilagy/webm-muxer README explicitly states the library is **deprecated, unmaintained, and superseded by Mediabunny**. The D4.6.5 prototype uses webm-muxer@5.1.4 only as a CI-installed dependency; do not promote it to production.
  Source: https://github.com/Vanilagy/webm-muxer/blob/main/README.md
- Vanilagy/mediabunny README documents actively developed TypeScript media tooling, WebM output, WebCodecs integration, timestamp precision, streaming I/O, zero dependencies and tree-shaking. GitHub repository is not archived and had recent updates at review time.
  Sources: https://github.com/Vanilagy/mediabunny ; https://github.com/Vanilagy/mediabunny/blob/main/README.md
- Mediabunny uses MPL-2.0, **not MIT**. Commercial and closed-source use are permitted, but distribution obligations (especially for modifications to covered files) and license notices need a release/legal review. Repository documentation is not a legal opinion.
- Existing project package.json contains no runtime muxer dependency; CI prototype installs webm-muxer and esbuild without saving lockfile. Electron is a dev dependency and production bundle is created by Vite/electron-builder.

## Candidate comparison
| Candidate | Maintenance | Licensing | Fit | Main unresolved issue |
|---|---|---|---|---|
| webm-muxer@5.1.4 + custom EBML patch | Explicitly deprecated | MIT | Proven six-second proof of concept | Opus padding, SeekHead/Cues offsets, arbitrary EBML layouts, security maintenance |
| Mediabunny WebM output | Active repository at review | MPL-2.0 | Preferred for an isolated N1.1 proof of concept | **Must demonstrate exact Opus duration, packet timestamps, silent endpoint, Electron playback and cancellation; not assumed** |
| Offline FFmpeg-based encoder | Established external toolchain | Depends on packaging/build/codecs | Potential deterministic fallback | Signed ARM64/x64 binaries, licensing, IPC security, runtime footprint, release process |

## Architecture decision
**Recommend Mediabunny for N1.1 feasibility tests only**, because the current prototype's upstream muxer is explicitly deprecated. Do not assert Mediabunny automatically handles Opus DiscardPadding, encoder delay, or precise end duration until decoded-sample and EBML tests prove it. Do not copy experimental EBML rewriting into production.

### N1.1 isolated proof-of-concept gates
1. Pin exact Mediabunny version in an isolated CI install (no production package.json or lockfile edit). Record package provenance and license.
2. Encode a six-second 24fps VP8 video with 48-kHz Opus audio and a silent six-second video, normal and stressed; explicit timestamps and monotonic packet PTS.
3. Decode with ffmpeg: exactly 144 frames, exactly 288000 audio samples for audio case; no audible or metadata duration drift; verify dissolve colors and frame PTS max gap.
4. ffprobe container duration exactly six seconds (reasonable codec tolerance); browser and Electron seeking near 5.75 seconds.
5. Exercise encoder reset/abort/retry, failure cleanup and bounded queues; record any API constraints and unsupported codecs.
6. Compare license text, npm dependency tree, advisories, bundle size and electron-builder inclusion before any production dependency proposal.
7. If exact audio trim is unsupported, stop and evaluate alternate muxer/encoding strategy. No hidden post-hoc patch of arbitrary EBML structures.

## N1 closure decision
**N1 research/recommendation complete; production muxer selection remains conditional on N1.1 feasibility.** Next step is a separate isolated Mediabunny prototype and red/green acceptance gates. Preserve Working, main and Draft PR #14.
