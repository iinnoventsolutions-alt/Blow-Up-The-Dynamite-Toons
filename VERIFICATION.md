## Build 10152026.1310 · Preferences and Workflow Completion

- Production TypeScript/Vite build and all 54 model/filesystem tests pass.
- All 14 browser workflows pass. Final camera and workflow runs also pass after the camera lookup refinement and full-screen error handling.
- Camera tests compare every whole frame of Linear/Ease/Hold motion across moves, copies and deletion; cover neutral panels, intact easing, batch moves, unsorted imported keys, no-op edits, global IDs, audio anchoring, Undo and atomic rejection at the 10,000-key limit.
- Workflow browser checks cover legacy/new preferences, defaults, Cancel, persistence, naming, dimensions/fps/layer/selection defaults, aspect-preserving PNG sizing, invalid signatures/corrupt image rejection before mutation, workspace restoration, Pitch captions/fullscreen, recovery suppression/enabling in Pitch, camera structural edits and compact Preferences.
- Existing drawing/text/zoom/editor/icon/onion/transition/audio/PDF workflows remain passing. Preferences and compact UI were visually inspected.
- Camera boundary keys and sampled cross-panel easing can increase key count and affect later shortening when keys collide. The explicit policy and complete reference checklist are in docs/Build_10152026.1310_Conflicts.html.
- Schema stays 4. Native Mac dialogs/fullscreen/tablet/performance/packaging remain for final integration testing.

## Build 10152026.1249 · PDF visual organization

- Production build and all 47 model/filesystem tests pass.
- PDF browser workflow passes for all four templates and profile/range/branding behavior, long-caption continuation, cancellation and unchanged project contents.
- Actual embedded font weights and PDF text operations are inspected: section/Scene/Panel headings use the 700-weight face; tested caption content uses the 400-weight face. PDF QA requires Python pypdf/fontTools as well as Poppler.
- Profile changes display a red stale-preview warning; refreshing clears it. Compact overview also passes at 14 pt captions / 54 pt margins / 300 DPI.
- PDF pages were rendered and visually reviewed for borders, heading contrast, content spacing and continuation. No blocking conflicts; box padding and repeated section headings may add continuation slots/pages.

## Build 10152026.1206 · PDF Export and Branding

- Production TypeScript/Vite build and 47 model/filesystem tests pass.
- All 13 browser workflows passed; final PDF-only changes were checked again with the PDF workflow.
- PDF coverage: four layouts, Letter/A4 and both orientations, cover/no cover, scene breaks, ranges and empty selection, selected panels, field toggles, camera modes, 150/300 DPI, custom logo, profile save/duplicate/delete/reload, preview, cancellation, unsupported glyph feedback and unchanged project serialization.
- Poppler text extraction verifies every line of a long caption, final sentinels, Unicode accents and transition descriptions. 18 pages across six output samples were rasterized and visually reviewed; revised camera labels were inspected again.
- Native PDF helper tests verify binary-safe atomic output, extension handling, chosen-path opening, cancellation and malformed-payload rejection. Actual Electron/macOS dialogs/PDF viewer remain unverified.
- Production dependency audit reports zero vulnerabilities. DejaVu and jsPDF license notices are included with public assets.
- No blocking model or timing conflicts. Reference differences and limits are documented in docs/Build_10152026.1206_Conflicts.html. Schema stays 4; audio, Drawing tools and Timeline timing behavior are unchanged.

## Build 10142026.1855 · Audio button descriptions

- Production TypeScript/Vite build passes.
- All four screenshot buttons have native hover descriptions; import guidance reflects the current track selection.
- Reviewed diff: only button titles, build metadata, and documentation changed. No audio behavior changes.

## Build 10142026.1737 · Audio and Animatics

- Production build, 44 model/filesystem tests, and all 12 browser workflows pass.
- Audio workflow verifies WAV/MP3 import, invalid-file rejection, waveforms, embedded saves, clip properties/drag/left-right trim/cross-track movement, volume/mute/solo, duplicate/delete/track deletion, Undo, source offsets and playback in Drawing/Timeline/Pitch.
- Live mixer changes update gain without restarting sources. Absolute clip positions persist through panel reorders/retiming; project end limits playback/export.
- WebM test contains HD video, audible audio mix, finite duration and dissolve imagery; cancellation produces no partial download. Large-media browser recovery (>5 MB) passes using IndexedDB.
- Schema 1/2/3 migrates to 4. Project size limit is 128 MB; audio budgets and real-time export limits are documented in docs/Build_10142026.1737_Conflicts.html. Native Mac audio/performance/packaging validation remains pending.

## Build 10142026.1716 · Drawing icon trial

- Production build and all 36 model/filesystem tests pass.
- Four relevant browser workflows pass: icon review, Drawing Tools, exact zoom/Pencil Editor and workspace/preferences regression.
- Icon checks cover all 14 tools plus palette/import/export, active states, Classic/Updated switching, persistence, unchanged artwork and compact rail access.
- Updated/Classic full-size and compact visuals reviewed. Original icons retained; rollback baseline 10142026.1701 (remote 8ff5f143299dd7ca3139461cda3ae7d49bb07504). Schema stays 3; logos and tool behavior unchanged.

## Build 10142026.1701 · Exact zoom sequence and Pencil Editor

- Production build, 36 model/filesystem tests and ten browser workflows pass.
- Canvas-derived coordinates replace Drawing SVG screen-matrix dependence; pointer focus prevents scrolling. Exact draw100→zoom175→draw tests cover Vector/Bitmap Brush/Pencil origin and persisted coordinates, including a stale SVG matrix.
- Pencil Editor tests cover select, move, pressure retention, segment-handle insertion, double-click insertion, delete, undo and save/reopen.
- Existing overlap fixes remain. User's native offset was not reproduced in the test browser before the change; Mac confirmation remains required. Schema stays 3.

## Build 10142026.1633 · Zoom and brush overlap fixes

- Production build and 35 model/filesystem tests pass; all eight previous browser workflows and a new drawing regression pass.
- New coverage verifies live/committed Brush/Pencil endpoint alignment at 100/150/200/300% on Vector/Bitmap layers, persisted coordinates, pan/rotation, round-cap direction, brush self-crossings at single opacity and selection, bucket holes and pressure Pencil.
- Existing SVG coordinate transforms passed zoom checks; fixes target smoothing lag, inward round caps and even-odd brush cancellation.
- Schema remains 3. Existing editable brush overlap rendering improves; previously flattened pixels and edited/stored cap geometry are not reconstructed. Native Mac/tablet checks remain pending.

## Build 10142026.1536 · Transitions

- Production build and 33 model/filesystem tests pass.
- All seven earlier browser workflows plus the new transition workflow pass.
- Transition checks cover adjacent/cross-scene boundaries, properties, type/direction/duration, delete/undo, save/reopen, all four effects, shared Drawing/Timeline/Pitch renderer, duplication cleanup, invalid durations and compact UI.
- Schema 1/2 upgrades to schema 3; malformed/dangling/duplicate transitions reject. Structural cleanup and timing clamps are undoable. Camera regression remains green.
- Visual review of Panel/Timeline/compact Drawing screenshots completed. Native Mac/tablet/performance validation remains pending.
- See docs/Build_10142026.1536_Conflicts.html for timing, format and boundary behavior.

## Build 10142026.1519 · Name correction

- Display name corrected to IInnovent Professional Storyboard, including header, launch, window/page title, packaging metadata, and project error/filter labels. Logo assets unchanged.
- Existing project identifiers, storage keys and legacy extensions retained. Packaged user-data directory preserved across the display-name change.
- Production build, all 28 model/filesystem tests, desktop syntax check, and targeted workspace browser regression pass.

## Build 10142026.1510 · Onion Skinning

- Production build and 28 model/filesystem tests pass.
- All six earlier browser workflows and the new onion workflow pass.
- Onion checks cover independent 0–3 counts, color/distance, scene isolation, Vector/Bitmap guides, white suppression, hidden layers, unchanged saved artwork, playback exclusion, device settings and compact toolbar fit.
- Full-size and compact Drawing screenshots reviewed. Schema remains 2; no unrelated feature changes.
- Native Mac/tablet/installer validation remains pending. See docs/Build_10142026.1510_Conflicts.html for rendering and compact-layout considerations.

## Build 10132026.2334 · On-canvas text and playback

- Production build and all 27 model/filesystem tests pass.
- New browser workflow verifies double-click edit/caret-at-end, commit/cancel/undo, bounds contraction, multiline expansion, Drawing playback across panels, shared toolbar placement, and unchanged Timeline playhead behavior.
- All five previous browser workflows pass alongside the new workflow.
- Toolbar placement is checked at 1500×1000 and 1100×740; text-bound and Drawing/Timeline screenshots visually reviewed.
- Schema remains 2. Existing Bitmap text, camera safeguards and native Mac/tablet validation limits remain.

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
