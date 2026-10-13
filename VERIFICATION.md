## Build 10132026.1234

- Production build and all 14 model/filesystem tests pass.
- Browser checks verify continuous rows across scene boundaries, scene continuation onto the next row, alternating colors, panel/scene drag and reorder, empty scenes, multi-select moves, undo, save, playback and timing controls.
- No new feature conflicts found. Native Mac validation remains outstanding.
- Published to Working; main remains unchanged.

## Build 10122026.2044

- Production build and all 14 model/filesystem tests pass.
- Browser acceptance workflow passes, including alternating Drawing/Panel scene backdrops, no Timeline filmstrip, a larger Timeline stage, and controls fitting at 1500×1000 and 1100×740.
- Existing panel/scene moves, duration resize, fixed thumbnail sizes, playback, scrubbing, undo, preferences, and save remain verified.
- No new feature conflicts found. Native Mac validation remains outstanding.

# Version 1 · Build 10122026.1627 verification

Date: October 12, 2026.

Passed:

- Strict TypeScript checking and production build.
- Fourteen model/filesystem checks: build metadata consistency; the requested two-destination move; multi-panel order/empty scenes/one-step undo; insertion anchor correctness; camera safeguards and whole-scene preservation; atomic plan rejection; fractional time/frame round trips; playback boundaries; original project/layer serialization, undo/redo, duplicate IDs, invalid-file rejection, and atomic saves.
- Previous drawing browser regression: brush/eraser isolation, layers/visibility/lock, undo, thumbnails, caption/selection across views, timing, playback, save/reopen, image import, PNG export, portrait canvas sizing, and pending duration editing during keyboard save.
- Version 1 browser acceptance: product/build labels; earlier `.innovent` import and `.issb` saves; time/frames preference; Panel-only destinations for the exact requested two-panel example; batch undo; insertion cues; cross-scene Drawing/Panel drag/drop; empty scenes; scene reorder; timeline stretch/squash; fixed thumbnail widths in other views; playhead motion, pause/stop/scrub, and playback across panels.
- Visual review of Drawing, Panel, and Timeline views. Tests also cover a short window.
- Desktop and build-script syntax checks.

Headless Chromium was supplied through `CHROME_PATH` because the normal browser installer returned invalid archives in this environment. The test browser is not distributed.

Remaining:

- Native Mac Electron launch, native dialogs/menu/close prompts, recovery on actual process restart, and operating-system file association.
- Intel and Apple Silicon installer builds, signing/notarization, clean-machine installation, and native icon rendering.
- Real tablet hardware, long sessions, large projects, and multi-monitor/full-screen interactions.
- GitHub publication: authenticated repository access confirmed; source published to main with the initial repository commit preserved.

The package remains a developer build with a tested browser preview and desktop integration source.

Scene drag-handler paths were checked with dispatched drag events and scene ordering buttons in the headless runtime. Real Mac scene-drag gestures remain part of native verification. Panel drag/drop was exercised with mouse gestures in both Drawing and Panel views.
