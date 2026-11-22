# RFU-A0 — Reproduction and Test Design Baseline

Status: **Investigation only**. No functional fix has been merged; no manual browser result is claimed.

## RFU1 — Timeline playback stalls

Source trace: `src/useAudioPlayback.ts` uses Web Audio `currentTime` for elapsed time, `requestAnimationFrame` to update the React playhead, and asynchronous `audioBuffers` preparation before scheduling. `src/App.tsx` updates both frame and selected panel on playback callbacks; `src/TimelineWorkspace.tsx` renders the preview, thumbnails, ruler, audio lanes and camera lane.

**Browser reproduction:** Create a 45-second project with nine panels, embedded artwork and two audio tracks; start playback in Timeline; capture monotonic timestamps and displayed frame every animation frame for 30 seconds; repeat 5 times. Measure longest gap between displayed frame updates and frame advancement against wall clock, compare Drawing/Pitch. Capture browser performance trace if gap exceeds 250 ms. Avoid classifying ordinary frame-rate variation as a stall.

**Acceptance test:** No sustained timer freezes or backwards frame progression during uninterrupted playback; frame-time drift and worst gaps must be reported alongside machine/browser details. Audio must remain synchronized after pause/resume and seek.

## RFU5 — Timeline viewport alignment

Source trace: `src/TimelineWorkspace.tsx` auto-scroll effect explicitly exits when `!playing`; it does not align the scroll viewport after a manual seek or Go to Start.

**Browser reproduction:** Load a project whose timeline exceeds viewport width, seek near the end, scroll horizontally, click Go to Start while paused, inspect `.timeline-scroll.scrollLeft` and playhead position. Repeat for seek-to-middle, ruler drag, Home/End, zoom and playback. Capture the viewport and ruler position.

**Expected:** The playhead is visible after seek and Go to Start; returning to frame 0 aligns the timeline to its start without a manual horizontal scroll. While playing, scrolling follows the playhead without oscillation.

## RFU6 — Audio drag snapback

Source trace: `src/AudioLanes.tsx` captures pointer on the clip button, maintains draft state during drag, commits the change on pointer-up, and cancels on pointer-cancel or lost capture. `src/App.tsx` commits audio edits through project history and updates selection.

**Browser reproduction:** With three audio tracks, drag one clip horizontally then vertically between tracks, at slow and fast speeds, including release over a different row. Repeat 20 times. Save/reopen after each committed move and compare clip `start`, `trackId`, `offset`, `duration` with the intended destination. Repeat undo/redo, zoom changes, and scroll during drag.

**Expected:** Every valid release persists to the intended track and frame; no unexpected reversion. Cancellation by Escape or pointercancel should restore original position.

## Mandatory evidence and sequencing

- First implement standalone Playwright tests and reproducible fixtures for all three RFUs. A deliberately failing reproduction test must be labeled diagnostic and kept out of the required green CI gate until the fix is implemented.
- Record pre-fix browser runs (screen capture or trace, exact actions, actual vs expected); do not claim a defect is reproduced solely from code inspection.
- Implement RFU-A1 (RFU1 and RFU5), then RFU-A2 (RFU6) with automated regression coverage and **actual browser interaction** tests.
- Re-run the existing `npm run test:ui`, `npm test`, build, Electron security trial and Mac installer verification after changes.
- Native Electron checks remain required before final RFU-D acceptance.

## References

User-provided RFU1, RFU5 and RFU6 MOV demonstrations are evidence supplied in the conversation; they are not stored in this repository. The user's RFU initiative report and `docs/RFU_Implementation_and_Acceptance.md` define the accepted scope.
