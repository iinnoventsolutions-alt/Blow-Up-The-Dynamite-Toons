## Build 10132026.1724 · Drawing adjustments

- Production build and all 26 model/filesystem tests pass.
- Targeted browser regression compares selection bounds with rendered glyph pixels for Arial, Georgia and Verdana, including multiline, bold/italic, tracking/indent, alignment, rotation, resize and save/reopen.
- Drawing-strip Duplicate/Delete/confirmation/Undo are verified.
- Camera endpoint dragging on later/duplicated panels preserves unique IDs and correct key times.
- Previous four browser workflows plus the new adjustment workflow pass; visual text-bound screenshot reviewed.
- Schema remains 2; no unrelated workflow changes. Existing camera safeguards and native Mac/tablet validation limits remain.

## Build 10132026.1629 · Drawing tools milestone

- Production build and all 25 model/filesystem tests pass.
- New drawing-tool browser workflow verifies Brush contours, Pencil centerlines/textures, point edits, filled shapes, picker, selection resize/duplicate/delete, editable text, visible-layer scope/locks, Space panning, view rotation, vector bucket fill, Bitmap painting/selection/erasing and save/reopen.
- Earlier drawing, layout/panel/timeline and camera browser workflows pass.
- Visual review of Vector and Bitmap tool screenshots completed.
- Schema 1 files upgrade in memory; schema 2 round-trip and malformed artwork rejection are tested.
- Native Mac pen/tablet pressure, installer, signing and notarization remain unverified.
- Working is the publication branch. See the current HTML report for format compatibility and Bitmap/fill limits.

## Build 10132026.1302 · Camera milestone

- Production build and all 19 model/filesystem tests pass.
- Camera browser acceptance covers scene IN/OUT setup, numeric pan/zoom/rotation, center and corner dragging, Escape cancellation, key retiming and collision rejection, undo/redo, thumbnail overlays, Timeline/Pitch camera rendering and playback, duration retiming, PNG export, save/reopen, and key deletion/clear.
- Earlier drawing regression and Build 1/layout browser acceptance pass, including continuous Panel rows, alternating scene colors and the dedicated Timeline layout.
- Visual review of Drawing, Panel and Timeline screenshots completed.
- Existing individual panel moves/deletion within camera-keyed scenes remain guarded. Duration changes reject key collisions. See the HTML report.
- Native Mac validation remains outstanding. Publish branch: Working; main is unchanged.

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
