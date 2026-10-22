# PT.1 — Performance baseline (instrumentation only)

Branch: `Performance-Tuning`. Starting baseline: `b87d6a9`.

## Included

- `scripts/pt1-fixtures.mjs`: reproducible schema-4 projects, 1/10/25/50 panels, 1920×1080, 24 fps, fixed-seed strokes and layered complexity.
- `scripts/pt1-benchmark.mjs`: isolated fill-mask/contour timings and project serialization/parsing, median/p95/max, fixture sizes, SHA-256 checksums, machine metadata, JSON output.
- No changes to production drawing, fill, renderer, or project schema.

## Run locally (Node 24+)

```bash
node --experimental-strip-types scripts/pt1-fixtures.mjs
PT1_REPEATS=30 PT1_COMMIT=$(git rev-parse HEAD) node --experimental-strip-types scripts/pt1-benchmark.mjs
npm test
npm run build
npm run test:ui
```

Output is placed under `benchmark-results/` (gitignored). These scripts are not substitutes for real browser/Electron click-to-visible-frame measurements.

## Baseline limitations and PT.1 next measurements

The fill benchmark measures `floodMask` and `maskContours` separately on synthetic pixel buffers. It does **not** measure worker transfer, canvas readback, bitmap flattening, history commit, actual frame paint, panel-switch latency, scrolling, playback or native M1 responsiveness. These must be measured with existing in-app Performance Diagnostics and repeatable M1 manual/browser test runs before declaring PT.1 complete.

Record 30 repetitions after warm-up for fill and navigation; cold/warm file opening and saving should have at least 10 samples. Archive environment details, timings and comparison notes. Do not optimize until baseline evidence has been reviewed. Do not merge into Security-Audit-W, Working or main without explicit approval.
