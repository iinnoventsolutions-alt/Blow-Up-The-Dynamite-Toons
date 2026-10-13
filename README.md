# Innovent Professional Storyboard

**Version 1 · Build 10132026.1234**

The GitHub download includes source, a sample project, tests, and this startup guide. The separately supplied developer ZIP also includes a prebuilt browser preview. It is not yet a signed/notarized Mac installer.

## Quick start: run the included preview

1. Unzip the package.
2. Install Node.js 24 LTS from https://nodejs.org if it is not already installed.
3. Double-click `Launch-Preview.command` on your Mac. For a GitHub source download, it installs dependencies and builds the preview on first launch; this requires internet access.
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

## Build 10132026.1234 changes

Panel view now places panels in one continuous grid. Scenes fill the remaining space on a row and continue onto the next row, retaining the alternating scene colors. Scene grips and ordering controls remain above the first panel of each scene; empty scenes retain their drop targets. Drawing, Timeline, and Pitch layouts are unchanged from Build 10122026.2044.

Future development builds publish to `Working`. `main` is updated only when a tested build is explicitly approved for promotion.

## Build 10122026.2044 changes

- Drawing and Panel views shade every second scene group (2, 4, 6, …), based on current scene order.
- Timeline uses its existing timing controls and tracks at the bottom, without a duplicate panel strip. The stage expands into the freed space.
- Version remains 1. All other functionality is unchanged.

## Earlier Build 10122026.1627 changes

- Product name: **Innovent Professional Storyboard**.
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

Open `docs/Build_10122026.1627_Conflicts.html` for the HTML report. It describes the empty-scene format change, time quantization, name collisions, camera safeguards, fixes found during testing, and GitHub publication status.

Individual panel moves involving a scene with camera keys remain blocked to avoid changing its scene camera timing silently. Whole-scene reorder preserves its keys. Reducing duration so a key would fall outside the scene is also blocked. Camera authoring/retiming UI is a later milestone.

## Existing capabilities and remaining modules

Working: layered brush/eraser drawing, color and size controls, stylus pressure input path, zoom/pan, safe guide, per-layer opacity/lock/visibility, thumbnail layer controls, panel duplication/deletion, dialogue/action/slugging/notes, undo/redo, image import as a layer, PNG export, save/open/recovery, and shared workspace state.

Later: authored camera movement UI and overlays, camera-cropped playback, onion skin, multiple audio tracks/waveforms, PDF templates and dual logos, additional vector/bitmap tools, full preferences, and verified native packaging. No native Toon Boom `.sboard` compatibility is implemented. `.issb` is our portable versioned JSON format with embedded images; its internal format identifier stays stable for earlier-file compatibility.

Developer limits remain 25 MB per project, 2,000 panels, 50 layers per panel, one million stroke points, 8 MB per imported image, dimensions 64–8192, and integer frame rates 12/24/25/30/48/50/60. Large-project performance and real tablet hardware still need validation. On-screen rendering is capped at 1920 pixels wide; PNG export uses the project width.

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

Version 1 Build 10122026.1627 is published to this repository through the authenticated GitHub connection. The existing initial commit is preserved. Command-line Git on another computer requires its own authentication.
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
