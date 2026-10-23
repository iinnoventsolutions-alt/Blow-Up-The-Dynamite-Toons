# PT.1B — End-to-end application diagnostics

This change is **diagnostic-only**. Fill mask computation, contour generation, and artwork semantics remain unchanged.

## Instrumentation

Existing DrawingStage bucket measurements already record image preload, render, pixel readback, worker elapsed, worker transport phases, geometry, commit and total handler latency. PT.1B adds **Bucket click to second frame**, a two-requestAnimationFrame proxy for browser-visible completion. This is **not** a guaranteed GPU presentation timestamp.

The existing Performance Diagnostics overlay now has **Export JSON**, preserving all currently buffered samples (maximum 100), timestamps, labels and durations. It collects no project contents. Export before the buffer rolls over.

## M2 Pro validation procedure

1. Build and run the `Performance-Tuning` branch, preferably as the packaged Electron application. Open Performance Diagnostics before the tests.
2. Import `benchmark-results/fixtures/pt1-50-panels.issb` generated with `node --experimental-strip-types scripts/pt1-fixtures.mjs`.
3. Measure cold open and warm open separately, and switch panels 1, 10, 25, 40 and 50 repeatedly. Record stopwatch/trace timing where the app does not yet expose an event.
4. Select the paint bucket and perform simple, moderate, complex, and repeated fills. Export JSON **after each scenario**, as the 100-entry ring buffer will otherwise discard earlier measurements.
5. Test Undo/Redo, save/reopen, scrolling and playback. Note visible pauses, errors, memory use and file sizes.
6. Run existing unit, browser and macOS packaging checks. Archive both benchmark JSON and app diagnostic JSON externally for review.

## Caveats

The 50-panel fixture contains synthetic vector art and camera keys; it does not yet represent realistic imported bitmap/audio workloads. This run does not by itself prove smooth 50-panel UI performance. Do not move to PT.2 until end-to-end results are reviewed.
