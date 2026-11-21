# RI2.15.5-C2.5 — ARM64 manual acceptance

**Status:** ARM64 PASS, 10/10 after targeted M1-08R clarification. Intel native acceptance remains pending.

User-reported signed-unpacked ARM64 application results:

| Test | Result |
|---|---|
| M1-01 Launch without errors | PASS |
| M1-02 Create new storyboard project | PASS |
| M1-03 Open existing storyboard project | PASS |
| M1-04 Draw, edit, save | PASS |
| M1-05 Camera IN/OUT and intermediate keyframes | PASS |
| M1-06 Camera playback and transitions | PASS |
| M1-07 Audio synchronization | PASS |
| M1-08R Existing Timeline Export Animatic works; FFmpeg-specific option not shown | PASS |
| M1-09 Quit and relaunch | PASS |
| M1-10 Reopen saved project | PASS |

**Interpretation:** Initial M1-08 FAIL reflected an ambiguous test description. The existing Timeline > Export Animatic function is permitted and works; the new gated isolated FFmpeg export option is not visible in the normal UI. This is UI-level confirmation only, not a proof that every internal export path is unreachable.

**Next checkpoint:** Native Intel x64 C2.5 manual acceptance using the same checklist and clarified M1-08R criterion. Do not alter Working, main, or Draft PR #14. No merge, production export activation, or distribution authorized.
