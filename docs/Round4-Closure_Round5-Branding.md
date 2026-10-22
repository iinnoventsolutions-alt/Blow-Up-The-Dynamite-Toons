# Round 4 closure and Round 5 branding baseline

## Round 4 — Performance Remediation
Status: accepted for the current development baseline, 2026-10-21.

Owner performed an additional Apple Silicon M1 smoke/performance check after
Phase 4.3B.3 and reported that performance was satisfactory. CI run
39555469416 (commit 83518841) passed the full regression, packaging and
security workflow, including exact contour geometry tests.

This acceptance does not assert that every frame stall is eliminated or that
the resulting package is notarized. Retain existing diagnostics for any future
regression, and do not alter rendering timing without browser regression tests.

## Round 5 — Application Icon and Branding
Status: in progress. Current identity is **IInnovent Professional Storyboard**.

Established visual identity:
- Two lowercase blue 'i' letterforms, crossed by an orange arrow.
- Source vector: `public/innovent-icon.svg`.
- Browser favicon: `/innovent-icon.svg`, declared in `index.html`.
- In-app header: `./innovent-icon.svg`.
- Welcome-screen company mark: `public/innovent-logo.jpg`.
- Desktop window icon: bundled `dist/innovent-icon.png`.
- macOS app/DMG icon: `public/innovent-icon.icns`, configured in `package.json`.
- Product naming in `package.json`, `src/build-info.json`, and desktop title.

The current blue/orange identity is retained pending an explicit design choice.
A new `tests/branding.test.ts` regression check verifies asset presence,
signature and wiring. A future logo redesign should update SVG, PNG and ICNS
as a synchronized set and inspect the rendered dock icon at small sizes.
Tool icon styling remains a separate user preference (Classic/Updated).

## Release constraints
Development build remains ad-hoc signed, not Developer ID signed or notarized.
All work must be performed on `Security-Audit-W` until a branch promotion is
explicitly approved. Never alter `Working` or `main` implicitly.

## Approved Round 5 application icon — asset replacement pending

Owner approved a specific uploaded icon rendering: dark rounded tile, artist's
drafting/storyboard board, two blue lowercase 'i' shapes and orange rising arrow.
This applies to **application icons only**. Preserve `public/innovent-logo.jpg`
and all other company branding unchanged.

The approved upload has been exported to 1024px PNG, macOS ICNS and SVG
wrapper in a local handoff ZIP. The exact bundle filenames that must overwrite
repository assets on `Security-Audit-W` are:
- `public/innovent-icon.png` — SHA-256 `5a8d65cc0f8911622441387140289782a78f5cf4ffe7a62fc1a89a1320796eff`
- `public/innovent-icon.icns` — SHA-256 `3dfcef2f2cc4055550c57d7c0335a75691e06eac7b8e1050ecbc20bd64592b7d`
- `public/innovent-icon.svg` — approved-image raster wrapped in SVG

Web favicon and header now reference the application PNG; Electron's desktop
window already uses that PNG, and macOS packaging uses the ICNS. A binary
upload is still required. Do **not** mark the visual icon replacement complete
until the committed assets match these digests and macOS packaging/reliability
tests pass. The company logo JPEG should not change.
