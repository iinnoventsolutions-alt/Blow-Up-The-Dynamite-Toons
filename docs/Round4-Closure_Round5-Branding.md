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
