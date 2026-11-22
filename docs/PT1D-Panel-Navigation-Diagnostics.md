# PT.1D — 50-panel navigation and rendering diagnostics

This phase adds diagnostics to the existing panel-selection handler, without modifying rendering or navigation behavior.

When Performance Diagnostics is enabled, switching to a different panel records:
- `Panel navigation: handler`: synchronous handler duration in milliseconds.
- `Panel navigation: click to second frame`: two-animation-frame responsiveness proxy (not an exact GPU presentation time).
- `Panel navigation: same-scene jump` or `cross-scene jump`: the **numeric value is the absolute panel-index distance, NOT milliseconds**. These labels are metadata; exclude them from latency statistics.

The existing `Canvas redraw: first render`, `Canvas: panel image preparation`, `React: Drawing workspace ...`, and `Renderer main-thread long task` samples provide supporting context. The generic UI-click measurement cannot be attributed to panel switching on its own.

## Manual benchmark on native Electron

1. Open the generated `pt1-50-panels.issb` project and enable Performance Diagnostics.
2. Switch between panels 1, 10, 25, 40, 50 and back. Repeat 30 times, with 5 warm-up operations, exporting JSON in batches before the 100-sample ring buffer overwrites earlier events.
3. Repeat 30 same-scene adjacent switches and 30 cross-scene switches. Avoid interacting with unrelated controls during each batch.
4. Test scrolling the 50-panel filmstrip and Panel workspace, noting visible pauses. Capture Chrome/Electron Performance traces if the app has no scroll-specific metric.
5. Compare latency medians and p95 only within the same action category. Note CPU, Electron version, zoom, window size and project state.
6. Run npm test, npm run build and available UI suites; verify that selecting panels, playback, Undo/Redo and bucket fills still work.

## Interpretation

This patch measures selection-handler time and a browser frame proxy, not complete image decoding, first contentful paint, compositor presentation, frame rate, or memory growth. Further profiling is justified only if the data indicates a repeatable bottleneck.

No production behavior changes. No merges to Security-Audit-W, Working or main.
