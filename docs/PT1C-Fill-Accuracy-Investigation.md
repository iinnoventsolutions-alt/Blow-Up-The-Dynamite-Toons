# PT.1C — Fill accuracy investigation (diagnostic-only)

User-provided screenshots show an attempted fill inside a highlighted rectangle on Scene 4, Panel 35 spreading across most of the background. The uploaded .issb has the fill reverted.

The exact rectangle in the deterministic fixture is stroke pt1_2564, Drawing 2, pencil size 3, with vertices (190,183), (358,183), (358,264), (190,264), (190,183). Its endpoints are identical; it is geometrically closed. Panel 35 has three vector layers, 25 strokes each.

Current fill behavior: DrawingStage selects active-layer or full-panel reference using fillReference, rasterizes with transparent background, and floodMask compares premultiplied RGBA against the seed, with optional gap morphology and four-neighbor flood traversal. A boundary omitted from the reference, antialiased/low-alpha edge accepted by tolerance, or a raster opening can connect interior and exterior. The exact cause is not established by timing JSON or screenshots alone.

Run: node --experimental-strip-types scripts/pt1-fixtures.mjs
Then: node --experimental-strip-types --test tests/pt1c-fill-accuracy.test.ts

Tests characterize containment, a one-pixel opening, faint boundary versus tolerance, and the reported fixture geometry. They are not a reproduction of the exact UI incident.

Next: repeat Panel 35 with all-visible-layers fill reference, tolerance 0 and gap 0; compare active-layer reference, then gap 1/2. Record click location and settings. If still failing, add opt-in pixel/mask diagnostics and a browser regression before any production algorithm change.

No production fill behavior was changed in this phase.
