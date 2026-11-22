## Preferences and Workflow Completion · Build 10152026.1310

**Preferences** now groups General, Drawing, Naming, Import / Export, Pitch and Shortcuts. Existing device preferences migrate automatically. **Done** keeps changes; **Cancel**, Escape or the close button restores the preferences present when the dialog opened. **Restore defaults** remains reversible until Done.

New defaults include project dimensions/frame rate, Vector/Bitmap layers, selection mode, bucket gap, zero-padded Scene/Panel names and scene-number increments. Optional workspace restoration, audio-track deletion warnings, recovery in Pitch and Pitch captions are configurable. Existing project dimensions, timing, names and artwork are not rewritten by preference changes. PNG exports can have a configurable longest-edge limit while retaining aspect ratio.

Panels in camera-keyed scenes can now be moved, copied and deleted. Camera motion follows the panel, including across scenes; unkeyed panels keep their neutral camera pose. Boundary keys isolate neighboring panels. Intact easing stays intact; ease curves clipped by panel boundaries are sampled at project frames to preserve the original poses. Audio remains at absolute project times. Structural edits remain one Undo step; transitions that lose adjacency are removed with a notice, as before.

**Camera limits:** extra boundary/sample keys can increase key count. Edits exceeding 10,000 keys per scene reject atomically. Dense sampled keys can also trigger the existing collision check when shortening panel duration; adjust/remove keys before shortening. Deleting the final panel of a scene remains blocked; moves may leave an empty scene.

Image import now checks actual PNG/JPEG/WebP content and decode success before adding a layer. Imported files remain embedded; limits are 8 MB and 16 megapixels. Pitch full screen presents the Pitch stage and transport, and captions can be hidden. Recovery is an emergency snapshot after editing stops, not an automatic overwrite of your project file.

See [the reference audit and build review](docs/Build_10152026.1310_Conflicts.html) for implemented, fixed, deferred and unsupported reference settings, known limits, and review steps. Project schema stays 4.

## PDF visual organization · Build 10152026.1249

All PDF profiles now put Scene and Panel details in separate bordered cells and each enabled information section (Dialogue, Action, Notes, Slugging and Transition) in its own box. Headings use an embedded bold font; names, timing values and caption content remain regular weight. Continuation slots repeat the relevant section heading and show **(cont.)** next to the panel name. The extra box padding and repeated headings can increase page count.

When a generated preview no longer matches the selected profile or settings, **Settings changed — refresh preview** appears in red. Regenerating the preview clears it. Export continues to generate from the current settings.

## PDF Export and Branding · Build 10152026.1206

Click **Export PDF** in the project header (or **File → Export PDF…** in the desktop app). Choose a saved profile, range, page settings, caption fields, imagery and branding. **Preview PDF** generates the document; **Export PDF** downloads it in the browser or opens a native Save dialog on desktop. Desktop can open the saved PDF automatically. A browser without an embedded PDF viewer can review the exported file in its PDF reader.

Four templates are included: **3 Panels Vertical** (artwork left, captions right, based on the supplied example), **3 Panels Horizontal**, **Full page**, and **Overview 2 × 4**. Letter/A4, portrait/landscape, margins, caption size, 150/300 DPI, cover page and scene page breaks are configurable. Long captions continue into additional panel slots/pages with repeated artwork and a continued label. Disable unneeded captions for a compact overview.

Export all panels, selected scenes, the current scene/panel, or panels checked in Panel view. Hidden layers stay hidden; opacity is respected; onion guides and selection handles are excluded. Choose full artwork, camera framing at the panel start, or artwork with camera movement marks. Camera movement output expands to include outlying camera frames and marks IN/OUT in green/red.

Company branding sits in the upper left; the IInnovent software mark sits in the upper right. Either can be hidden. Replace the company logo with PNG/JPEG/WebP (under 2 MB/16 megapixels). Use **Save profile** to retain changes; New, Duplicate and Delete manage up to 30 device-local profiles. Profiles/logos are not embedded in .issb projects. No project schema change.

PDF captions are selectable text using an embedded font. Unsupported glyphs (including some emoji/CJK) produce an explicit message instead of silent substitution. Artwork is rasterized at the chosen print resolution (4096-pixel edge cap), not editable PDF vector artwork. Exports are limited to 500 pages/128 MB. Password protection, tracked-panel ranges and legacy XML profile import are not implemented. Native Mac PDF viewer/save/open behavior still needs hardware review.

See [the build review](docs/Build_10152026.1206_Conflicts.html) for reference differences, validation and remaining milestones.

## Audio button descriptions · Build 10142026.1855

Hover over Import audio, + Audio track, New-track imports, or Export animatic in Timeline for a description of its function. Import guidance reflects the selected track. Button behavior is unchanged.

## Audio and Animatics · Build 10142026.1737

In **Timeline**, import one or several audio files. With no track selected, each file creates its own track; selected-track imports go into that track. **New-track imports** clears the destination. Move clips by dragging their bodies, trim with their edges, or select them for precise start/source-in/duration and track controls. Use track volume, Mute and Solo while playing. Clip edits pause playback; audio positions stay at absolute project times when panels change.

Audio is embedded in `.issb` files and plays with picture/camera/transitions in Drawing, Timeline and Pitch. **Export animatic** produces a WebM video with sound (HD, up to 1920 pixels on the longest edge). Recording runs in real time; keep the app visible. Audio beyond the storyboard end is excluded until you extend panel timing.

**Compatibility:** Schema 4 saves contain audio. Schema 1/2/3 projects upgrade in memory; original files remain unchanged until saved. Older builds cannot open schema 4 projects. Projects support up to 128 MB; individual audio files up to 25 MB/30 minutes, 32 tracks, and a 512 MB decoded-audio budget. WAV/MP3 are verified; other accepted formats depend on the local decoder. Browser history/recovery uses IndexedDB for larger media projects.

See `docs/Build_10142026.1737_Conflicts.html` for usage, timing rules, validation and limits.

## Drawing icon trial · Build 10142026.1716

All Drawing tools now use an alternate silhouette icon set, including the color palette and image import/export controls. To revert instantly, open **Preferences → Drawing tool icons → Classic**. The choice persists on this device and does not affect projects. The full rollback baseline is **Version 1, Build 10142026.1701**, GitHub revision `8ff5f143299dd7ca3139461cda3ae7d49bb07504`. See `docs/Build_10142026.1716_Icon_Review.html` for a side-by-side comparison.

## Zoom / Pencil Editor follow-up · Build 10142026.1701

Drawing coordinates now come directly from the rendered canvas, including after zoom, pan and rotation; focusing the stage cannot scroll it. The regression suite includes drawing at 100%, zooming to 175%, then drawing again.

For **Pencil Editor**, click a **Vector Pencil** stroke. Drag its square control points, or drag a hollow circle along a segment to add a point. Double-click a segment also inserts a point. Delete removes the selected point; Undo restores it. Point movement preserves pressure. Brush strokes use **Contour Editor**; flattened Bitmap artwork has no editable spine.

## Drawing fixes · Build 10142026.1633

Brush/Pencil live endpoints now stay under the pointer while earlier samples are smoothed, including above 100% zoom. New round contour caps extend outward, and self-crossing brush paint no longer cancels at overlaps. Bucket-fill holes remain intact. Existing editable brush contours use the corrected overlap renderer; flattened Bitmap pixels and previously edited contour geometry are preserved.

## Transitions · Build 10142026.1536

Select the outgoing panel, then **+ Transition** in Drawing, Panel, or Timeline. Click the hourglass boundary marker to open its properties. Choose **Dissolve**, **Edge Wipe**, **Clock Wipe**, or **Slide**, set its duration, and choose direction where available. **Preview transition** seeks to its start; press Play to watch it. **− Transition** deletes the selected transition; Undo restores it.

Transitions work within and between scenes. They use the outgoing panel’s final frames (default up to one second) without changing total runtime. The incoming artwork is previewed at its first camera pose; the outgoing camera continues moving. Shortening a panel clamps its transition, and a one-frame panel removes it. Reordering/duplicating/deleting panels that separate a transition’s pair removes that transition with a notice; Undo restores both in one step. Ordinary panel PNGs remain clean artwork.

**Compatibility:** New saves use project schema 4. Schema 1/2/3 projects open through an in-memory upgrade; original files remain unchanged until Save. Earlier app builds cannot open schema 4 files. Keep an earlier copy if testing a rollback. Version stays 1.

## Onion Skinning · Build 10142026.1510

In Drawing, use **Onion skin** between playback and zoom controls. Set **Back** and **Forward** independently to 0–3 panels. Backward artwork is red; forward artwork is green, fading with distance. Skins stay within the current scene and are drawing-only guides. Settings persist on this device (initially off, one panel each way). White paper is suppressed in guides; active opaque artwork can cover them. Project artwork and exports remain unchanged.

# IInnovent Professional Storyboard

**Version 1 · Build 10132026.2334**

The GitHub download includes source, a sample project, tests, and this startup guide. The separately supplied developer ZIP also includes a prebuilt browser preview. It is not yet a signed/notarized Mac installer.

## Quick start: run the included preview

1. Unzip the package.
2. Install Node.js 24 LTS from https://nodejs.org if it is not already installed.
3. Double-click `Launch-Preview.command` on your Mac. For a GitHub source download, it installs dependencies and builds the preview on first launch; this requires internet access. The launcher also rebuilds when a new build number is detected.
4. Keep its Terminal window open while using the app. The local preview opens in your browser.
5. Use **Open** and choose `examples/Welcome.issb` to try the sample storyboard.

If double-click does not work, open Terminal in the unzipped folder and run:

```bash
bash Launch-Preview.command
```

The prebuilt ZIP preview requires no npm dependency installation. A GitHub source download needs a one-time dependency installation and build, handled by the launcher. No account or activation is required. Its local address is http://127.0.0.1:4317. Close the previous preview before launching another copy. To stop it, press Control+C in Terminal.

Preview Save downloads an `.issb` file. Open imports that file. Recent projects and recovery snapshots use browser storage, whose quota can vary; downloaded project files are the durable copies.

## Run the desktop application from source

Current target: macOS 13 Ventura or newer, Intel or Apple Silicon, with Node.js 24 LTS installed.

From Terminal in this folder:

```bash
npm ci
npm run desktop
```

The first installation downloads dependencies and Electron. Application operation is offline after installation. The Electron shell implements native Save/Open, File/Edit menus, recent files, recovery, and unsaved-close prompts. Those native interactions still need testing on a Mac. The shared model, filesystem persistence, and browser interface have automated checks.

The current Electron runtime minimum is documented at https://www.electronjs.org/docs/latest/breaking-changes. Mac signing, notarization, and installer verification remain release tasks.

## Build 10132026.2334 · On-canvas text and playback

- With **Text (T)** selected, double-click editable Vector text on the stage to type directly into it. The cursor starts at the end. Click outside or press Cmd/Ctrl+Enter to commit; Escape cancels. Plain Enter adds a new line. The existing inspector text-edit option remains available. Each completed on-canvas edit is one undo step, and saving commits an active editor first.
- Selection bounds now follow only the current rendered text, rather than including the object’s stale stored rectangle. Shortening text contracts the box; multiline/style/size changes update it without extra space from an earlier layout. Alignment anchors and artwork positions remain intact. Pixel text already flattened into Bitmap layers retains its existing raster behavior.
- Drawing and Timeline share playback controls centered in the stage toolbar, between scene/panel breadcrumbs and view controls, matching the supplied reference. Drawing playback includes camera framing, follows project timing across panels, and supports pause, stop, start and frame stepping. Stop returns to the drawing tools. Selecting a drawing tool also returns to editing.
- Drawing adds no timeline-style playhead or indicator to its panel strip. Timeline retains its existing playhead, scrubbing, key lane and clip resizing; only its transport controls move to the common toolbar.

See `docs/Build_10132026.2334_Conflicts.html` for verification. File schema remains 2; the major version remains 1. Development builds continue to publish to Working.

## Build 10132026.1724 · Drawing adjustments

- Text selection handles now use rendered font metrics rather than estimated character widths. They enclose text after font/style changes, tracking, multiline content, resizing, rotation and reselection.
- Drawing’s panel strip now has **Duplicate** and **Delete** beside **+ Panel / + Scene**. These act on the selected panel, using the same undo, deletion confirmation and camera safeguards as the inspector buttons.
- Fixed a camera ID bug: poses sampled from endpoint keys carried metadata that could overwrite a newly created key’s ID/frame when dragging. Camera key creation now copies only pose/interpolation values, preserving distinct IDs and the requested time. This was an application bug, not user error; failed edits did not modify project data.

Camera quick start: choose **Camera (C)**, then **Set scene IN / OUT**. Select a key time in Camera controls; adjust X/Y, zoom, rotation or interpolation. In Drawing, drag green/red frame centers to pan and corner squares to zoom. Timeline and Pitch preview the move. You can use these controls on duplicated panels without the former duplicate-ID error. Existing safeguards still protect individual panel deletion/transfers in camera-keyed scenes.

See `docs/Build_10132026.1724_Conflicts.html` for verification. File schema remains 2 and the major version remains 1.

## Build 10132026.1629 · Drawing tools milestone

Open `examples/Drawing_Tools_Demo.issb`. New layers are Vector by default; use **New layer type** in the Layers section to create Bitmap layers. **Flatten to Bitmap** rasterizes a Vector layer and can be undone. Imported images use Bitmap layers.

- **Select (V):** Individual, Rectangle, or Lasso selection. **Selection scope** toggles Active layer / Visible unlocked layers. Shift adds to a selection. Drag the selection box to move, its four corners to resize, or the round handle to rotate. Shift constrains proportions. Duplicate/Delete artwork and Deselect are in properties; Delete/Backspace also removes selected artwork.
- **Brush (B):** Stores filled, closed outlines on Vector layers. **Contour Editor** selects brush/fill contours and exposes edge points. Drag a point, double-click a segment to insert one, or Delete a selected point. Straight strokes are simplified while bends and pressure changes remain editable.
- **Pencil (P):** Stores an editable centerline with width and pressure. **Pencil Editor** exposes the spine points. Its properties can change existing line width, color and texture with **Apply properties to selection**.
- **Text (T):** Enter text in properties and click to place it. Click existing Vector text with the Text tool to load its settings; **Update selected text** applies edits. Select gives resize/rotation handles. Font, bold/italic, alignment, tracking, automatic kerning, indent and line spacing are available. Text on Bitmap layers flattens into pixels when placed.
- **Eraser (E):** Size, pressure, minimum width, smoothing and cap controls. Erases only the active visible/unlocked layer. Vector erasing uses a mask stroke; Bitmap erasing updates pixel transparency.
- **Paint Bucket (F):** Color tolerance, No/Small/Medium/Large gap closing, and Active/Visible fill reference. Fills go onto the active unlocked layer. On Vector layers they become editable contour regions; Bitmap layers flatten them. Gap closing affects the fill boundary and preserves source lines.
- **Shape (U):** Rectangle, Ellipse, or Line with stroke width and optional fill color. Shift constrains squares/circles and line angles.
- **Color Picker (I):** Samples the visible artwork. Color controls include opacity, HSV sliders, swatches and add/remove swatch actions.
- **Hand (H):** Pan the drawing view. With any Drawing tool selected, **hold Space** to temporarily pan; releasing Space restores that tool. Space still controls playback in Timeline/Pitch.
- **Rotate View (R):** Drag horizontally or use its rotation slider; **Fit** resets pan, zoom and view rotation. This changes the view, not the artwork.
- **Select by Color:** Selects matching-color Vector objects in the chosen scope. Use ordinary Individual/Rectangle/Lasso selection for Bitmap pixels.

Solid, Graphite and Chalk are built-in textures. Presets save tool settings on this device. Pencil textures remain procedural and can be changed on existing lines. Pressure is used when the pointing device supplies it; a mouse draws at full pressure. Native Mac pen/tablet hardware still needs testing.

Bitmap edits and selections support project canvases up to 16 megapixels, including 4K. Bitmap selections transform pixel regions and flatten on commit; they have no vector control points. Bucket boundaries use a working grid up to 2048 pixels on the longest side, then convert into project-space contours. Text uses installed system fonts; custom font and custom texture import are not included in this build.

**File compatibility:** This build saves schema 4 `.issb` projects and opens schema 1/2/3 files through an in-memory upgrade. Existing files are not modified until Save. Earlier builds cannot open newly saved schema 4 projects; preserve earlier files when testing. The application’s major version remains 1. See `docs/Build_10132026.1629_Conflicts.html` for safeguards and verification.

## Build 10132026.1302 · Camera milestone

The Camera tool (`C`, or the camera icon in the tool rail) edits scene-owned keyframes. Expand **Camera controls** in the inspector from any workspace.

1. Open `examples/Camera_Demo.issb` to try a complete move, or choose **Set scene IN / OUT** to create keys at the first and last scene frames. Existing keys remain intact.
2. Click a key time or scrub **Scene camera time**. Edit Camera X/Y (project pixels), zoom (1 = full project frame), rotation (degrees), and Linear / Ease in-out / Hold interpolation to the next key. Editing a pose between keys creates a new key there.
3. With the Camera tool in Drawing view, drag a green IN or red OUT center to pan. Drag its corner squares toward the center to zoom in or away to zoom out. Escape cancels a drag; each completed drag is one undo step. The frames show the active panel’s first/last camera poses, including moves that span panels. The dashed orange frame shows the current pose.
4. Use **Add / update key**, **Key frame (scene)**, **Delete key**, **Reset current pose**, and **Clear scene camera** to refine the move. All frame numbers are zero-based within the scene. Clearing keys requires confirmation and can be undone.
5. Timeline’s camera lane shows key diamonds; click one to seek. Timeline and Pitch playback show the actual camera view with matching pan, zoom and rotation. Drawing/Panel thumbnails retain artwork with movement overlays.
6. **Export camera PNG** exports the current camera view; **Export overlay PNG** includes panel IN/OUT frames and movement arrows. The existing toolbar PNG export remains a clean artwork export. PDF template exports follow in their milestone.

Camera transforms never change drawing layers or stroke coordinates. Keys save in `.issb` files, recovery snapshots, and undo/redo using the existing project format. A scene without keys uses the original full-frame view.

Changing panel duration scales keys inside that panel and shifts keys in later panels. If shrinking would merge keys onto one frame, the edit is rejected with a message; move/delete a key first. Duplicating a panel copies its artwork and shifts later keys to preserve their position relative to subsequent panels; it does not duplicate the scene camera track. Appending a panel holds the final authored pose until another key is added.

Individual panel transfers involving camera-keyed scenes and panel deletion within those scenes remain guarded. Clear keys first, or move the whole scene to preserve its track. This build implements 2D camera transforms; 3D camera depth and PDF templates remain later milestones. See `docs/Build_10132026.1302_Conflicts.html` for conflicts and verification.

## Build 10132026.1234 changes

Panel view now places panels in one continuous grid. Scenes fill the remaining space on a row and continue onto the next row, retaining the alternating scene colors. Scene grips and ordering controls remain above the first panel of each scene; empty scenes retain their drop targets. Drawing, Timeline, and Pitch layouts are unchanged from Build 10122026.2044.

Future development builds publish to `Working`. `main` is updated only when a tested build is explicitly approved for promotion.

## Build 10122026.2044 changes

- Drawing and Panel views shade every second scene group (2, 4, 6, …), based on current scene order.
- Timeline uses its existing timing controls and tracks at the bottom, without a duplicate panel strip. The stage expands into the freed space.
- Version remains 1. All other functionality is unchanged.

## Earlier Build 10122026.1627 changes

- Product name: **IInnovent Professional Storyboard**.
- Display version: **Version 1**. Build: **10122026.1627**.
- Two blue lowercase i letters with a crossing orange arrow: SVG for the UI, PNG and ICNS for packaging.
- New project saves use `.issb`. Earlier `.innovent` files can still be opened. In the desktop app, saving an earlier-extension file offers a new `.issb` copy, preserving the original.
- Duration editing defaults to **time in seconds**. Preferences → Duration display and editing switches to Frames. Times snap to the project frame grid; the project stores whole frames.
- Drawing and Panel views support panel drag/drop within and between scenes, with orange insertion lines. Scene grips reorder whole scenes. Arrow buttons provide an alternative scene ordering control.
- Panel view alone has multi-selection and **Move selected…**. Use checkboxes, Command/Control-click, or Shift-click. Set a scene and an insertion position separately for each panel, or apply a common destination to the group. The batch is one undo step.
- Empty scenes are retained when their last panel is moved out. Drop panels back into the empty-scene target. A project must still contain at least one panel.
- Timeline has top-center Play/Pause, Stop, Go to start, and frame navigation; a moving orange playhead; click/drag scrubbing on the ruler; and playback that follows panel boundaries.
- Drag the right edge of a timeline clip to stretch or squash its duration. Arrow keys on the resize handle change one frame; Shift+Arrow changes ten. Escape or pointer cancellation discards a resize preview. A completed drag is one undo step.
- Timing updates the duration information everywhere. Thumbnail card sizes in Drawing and Panel views remain fixed. Only timeline clip widths change.

Layers, drawing tools, import/export, captions, preferences already implemented, and the overall design otherwise follow the previous milestone.

## Example: move panels to different scenes

In Panel view, select Scene 1 / Panel 3 and Scene 1 / Panel 2. Click **Move selected…**.

- For Panel 3, choose Scene 2 and **Before Panel 2**.
- For Panel 2, choose Scene 3 and **At end of scene**.
- Click **Move 2 panels**.

Panels retain their IDs, drawings, layers, notes, and durations. Names remain editable and are not automatically changed. Destination choices include position numbers to distinguish repeated panel names.

## Build numbering

Builds use **MMDDYYYY.HH24MI** in America/New_York. Versions change only for a major release. The supplied timestamp is preserved exactly in this build.

`src/build-info.json` supplies the UI and desktop About information. Package tooling uses `1.0.0` as its required semantic version, while the user-facing version remains 1 and its build stamp is separate.

For a later build at the current local time:

```bash
npm run set-build
```

To set an explicit build:

```bash
npm run set-build -- 10132026.0920
```

For a major release only:

```bash
npm run set-build -- 11152026.1430 --version 2
```

This updates display metadata, package metadata, and the lockfile together. Ordinary build updates do not increment the major version.

## Conflicts and safeguards

Open `docs/Build_10142026.1737_Conflicts.html` for the current HTML report. Earlier reports remain as build history. It describes the empty-scene format change, time quantization, name collisions, camera safeguards, fixes found during testing, and GitHub publication status.

Individual panel moves involving a scene with camera keys remain blocked to avoid changing its scene camera timing silently. Whole-scene reorder preserves its keys. Reducing duration so a key would fall outside the scene is also blocked. Camera authoring/retiming UI is available; timing collisions are rejected.

## Existing capabilities and remaining modules

Working: layered brush/eraser drawing, color and size controls, stylus pressure input path, zoom/pan, safe guide, per-layer opacity/lock/visibility, thumbnail layer controls, panel duplication/deletion, dialogue/action/slugging/notes, undo/redo, image import as a layer, PNG export, save/open/recovery, and shared workspace state.

Also working: Vector/Bitmap tools and point editors, camera authoring/overlays/playback, onion skins, transitions, multiple audio tracks/waveforms and WebM animatic export. Later: PDF templates and dual logos, remaining preferences/workflow refinements, and verified native packaging. No native Toon Boom `.sboard` compatibility is implemented. `.issb` is our portable versioned JSON format with embedded images and audio; its internal format identifier stays stable for earlier-file compatibility.

Developer limits remain 128 MB per project, 2,000 panels, 50 layers per panel, one million stroke points, 8 MB per imported image, dimensions 64–8192, and integer frame rates 12/24/25/30/48/50/60. Large-project performance and real tablet hardware still need validation. On-screen rendering is capped at 1920 pixels wide; PNG export uses the project width.

## Tests

```bash
npm test
npm run build
npx playwright install chromium
npm run test:ui
```

`test` covers the project model, moves, timing, metadata, camera safeguards, validation, undo, and atomic persistence. `test:ui` runs both the drawing regression workflow and the Version 1 acceptance workflow. Set `CHROME_PATH` to a local Chromium executable if the browser installer is unavailable.

Test screenshots are internal QA artifacts under `test-results` and are excluded from Git and this delivery. See `VERIFICATION.md` for the actual checks and remaining native checks.

## Source layout

- `src/model.ts`: shared project, editing/history, move plans, timing lookup, camera evaluator.
- `src/project-format.js`: shared validation and serialization.
- `src/build-info.json`: display version and build.
- `src/App.tsx`: application shell and shared project state.
- `src/PanelBoard.tsx`: Drawing/Panel drag/drop and scene controls.
- `src/MovePanelsDialog.tsx`: Panel-only batch destination editor.
- `src/TimelineWorkspace.tsx`: playback controls, ruler/playhead, duration resize.
- `src/DurationInput.tsx`: time/frames duration editor.
- `src/Canvas.tsx` and `src/render.ts`: drawing and layer compositing.
- `desktop/`: Electron shell, isolated bridge, atomic files, local preview server.
- `scripts/set-build.mjs`: timestamp updates without automatic major-version bumps.
- `tests/`: model/filesystem and browser workflows.

## GitHub connectivity and commits

Target: https://github.com/iinnoventsolutions-alt/IInovent-Storyboard-Pro

Development builds are published to Working through the authenticated GitHub connection. The existing initial commit is preserved. Command-line Git on another computer requires its own authentication.
For publishing, the connected GitHub account/app must have access to this exact repository and permission to write its contents. Protected branches can require a build branch and pull request instead of direct main-branch pushes. Commit attribution uses a configured name/email; authentication is separate from attribution. Never paste tokens into this chat or commit credentials into source.

On your own computer, GitHub CLI (`gh auth login`) or Git Credential Manager can authenticate Git without embedding credentials in commands. Useful primary documentation:

- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app

The ZIP also includes `git/Innovent_Professional_Storyboard_V1_Build_10122026.1627.bundle`, which preserves the local commit and build tag. To restore that history into a new source checkout, run `git clone git/Innovent_Professional_Storyboard_V1_Build_10122026.1627.bundle restored-source` from the unzipped folder.

No force-push is part of this workflow. The prepared source branch must be reconciled with existing remote contents before updating a repository that already has history. The initial placeholder README is replaced by these complete run instructions.

## Mac packaging

On a compatible Mac:

```bash
npm run package:mac
```

Configured outputs are Intel and Apple Silicon DMGs under `release`, with the new name, icon, and `.issb` association. Native packaging and file double-click association still need Mac validation. Signing/notarization is separate from product activation; this app requires no license activation.

Audio browser acceptance uses FFmpeg/ffprobe on PATH for independent media-file verification. These tools are not required to launch the application or export WebM.
