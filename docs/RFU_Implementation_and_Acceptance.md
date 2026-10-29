# Release Feature Updates (RFU) — Approved Scope and Execution Gates

**Status:** Approved for implementation; **RFU-A0 investigation started**, no defect fixes accepted yet.
**Branch:** `Working`. **Release acceptance:** R1.2 on hold pending RFU-D verification.
**Safeguards:** Do not change `Release` or `main` or publish a release without separate approval.

## Requirements

| ID | Priority | User requirement | Acceptance evidence |
| --- | --- | --- | --- |
| RFU1 | P0 | Timeline playback and displayed timer must advance without intermittent stalling | Repeated manual browser playback at normal speed, recorded timer/frame progression and automated timing regression |
| RFU2 | P0 | Selectable red OUT and green IN camera handles; manipulate only the selected camera endpoint | Direct browser drag/select tests for each endpoint, preservation of unselected endpoint |
| RFU3 | P0 | Camera position must not revert after dragging | Repeated drag/release, panel switch, save/reopen tests |
| RFU4 | P1 | Copy a panel's camera OUT position and paste it as the destination panel's solo/START position | Source and destination camera values verified; destination OUT unchanged |
| RFU5 | P1 | Timeline horizontal viewport follows the playhead on seek, start, and playback | Manual seek-to-start/end and scroll alignment checks |
| RFU6 | P0 | Audio clip positions must not revert after vertical or horizontal drag | Repeated drag, cross-track, save/reopen and undo tests |
| RFU7 | P1 | Delete Audio and Delete Track buttons beside Timeline import controls | Selection-aware, confirmation/undo and correct cleanup tests |
| RFU8 | P1 | Splash must display first, then Open/New screen; never overlap | Native Electron startup observation, multiple cold/warm launches |

## Workstreams and checkpoints

1. **RFU-A0 — Investigation and reproducible baseline:** inspect playback scheduling, seek/scroll, audio pointer capture and state persistence. Document likely causes and establish failing tests before changing behavior.
2. **RFU-A1 — Timeline playback and playhead:** RFU1, RFU5; run automated and real browser tests.
3. **RFU-A2 — Audio movement:** RFU6; repeated browser drag and save/reopen.
4. **RFU-B — Camera:** RFU2, RFU3, RFU4; direct canvas handle tests and state validation.
5. **RFU-C — Controls/startup:** RFU7, RFU8; browser and native Electron startup tests.
6. **RFU-D — Release acceptance:** full automated suite, **mandatory manual browser interaction evidence for every functional change**, native Electron tests for startup and playback, security trial, dual Mac builds, checksum and malware verification, then resume R1.2.

## Investigation notes (initial source review; not confirmed diagnoses)

- `src/useAudioPlayback.ts` derives playback frames from Web Audio context time, updates React frame state on animation frames, and schedules audio asynchronously. Investigate rendering cost and scheduling startup when diagnosing RFU1.
- `src/TimelineWorkspace.tsx` auto-scrolls only while `playing`; manual seek and Go to Start do not explicitly align the viewport. This is a plausible RFU5 cause.
- `src/AudioLanes.tsx` uses pointer capture and clears drag state in `onLostPointerCapture`; inspect pointer event order, commit state and cross-track drops for RFU6.
- A browser test is not equivalent to native Electron launch testing. RFU8 requires a native cold-start check.

## Acceptance rules

- Each issue needs reproducible pre-fix behavior or a clearly documented missing feature.
- Every change needs automated regression coverage where feasible.
- **Manual browser testing is mandatory before acceptance**, including repeated interactions for intermittent defects.
- RFU8 additionally requires native Electron cold/warm startup testing.
- A green GitHub Actions build alone does not count as manual acceptance.
- Any failed check must be fixed on `Working` and revalidated before moving to the next approval checkpoint.

## User-provided evidence

RFU1 TimelineStutter.mov; RFU2 Missing-Green-Red-Selectors.png and Red-Green-Selector-EndResult.png; RFU3 Camera-Snapback.mov; RFU5 Timeline-Horizontal-Scroll.mov; RFU6 AudioSnapback.mov; RFU7 SectionForDeleteButtons.png; RFU8 SplashandOpenScreen.mov. Evidence files were supplied in the project conversation, not committed to the repository.
