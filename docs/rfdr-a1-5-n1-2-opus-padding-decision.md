# RFDR N1.2 — Targeted Opus padding decision

Status: **N1.2 investigation closed; Mediabunny VP8/Opus WebM route blocked for production without supported padding**.

## Verified evidence
- N1.1 Actions run 42964434602: both silent six-second fixtures PASS (144 VP8 frames, duration 6.0); both Opus fixtures FAIL (288648 decoded samples instead of 288000, reported duration 6.02). Stress and normal agree.
- Mediabunny upstream `src/matroska/matroska-muxer.ts` (reviewed 2026-11-11): `addEncodedAudioPacket` lines ~1072–1079 uses `codecDelay` and packet duration; track entry lines ~394–397 writes `CodecDelay` and `SeekPreRoll`; `createBlockElement` lines ~1395–1440 creates `BlockGroup` with `BlockDuration` and additions but no `DiscardPadding`. Searching the muxer source for `DiscardPadding` or `discardPadding` returned no matches. This supports a limitation in the inspected upstream version; it does not establish that every future version or API path is unsupported.
- The earlier webm-muxer prototype had the same 648-sample discrepancy. Experimental direct EBML rewrite corrected it but has unresolved Cues/SeekHead offset safety and is not approved for production.

## Decision
**Do not proceed with Mediabunny + Opus WebM as production architecture on current evidence.** Do not fork or patch the muxer or extend the ad hoc EBML rewrite in this checkpoint. This is a source-backed stop condition, not a failure of the existing production exporter.

## Next short gate (N1.3)
Compare one alternative that avoids the exact Opus end-padding limitation, such as Mediabunny MP4/AAC or a packaged offline encoder, against the project's required output format and platform support. Preserve WebM compatibility expectations; changing exported format requires explicit product approval. First verify codec support and exact duration in an isolated fixture; only then consider production integration.

Sources:
- https://github.com/Vanilagy/mediabunny/blob/main/src/matroska/matroska-muxer.ts
- https://github.com/iinnoventsolutions-alt/Blow-Up-The-Dynamite-Toons/actions/runs/42964434602
- https://github.com/Vanilagy/webm-muxer/blob/main/README.md

No production files, Working, main, or Draft PR #14 changed.
