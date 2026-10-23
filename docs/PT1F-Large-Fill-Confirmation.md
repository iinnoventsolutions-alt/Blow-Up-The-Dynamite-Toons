# PT.1F — Large fill confirmation

After calculating contours, the bucket estimates coverage using the absolute signed sum of contour areas (holes subtract). If the result covers at least 60% of the project canvas, the app asks for confirmation before committing. Cancel leaves the panel unchanged. Normal fills below the threshold do not show a dialog. A full-background fill remains available by approving the confirmation.

This is a confirmation rather than a graphical overlay preview; no fill algorithm or default settings were changed. Coverage is approximate, based on generated vector contours.

## Manual regression checklist

1. With Drawing 3 active and reference Active layer, click inside the Drawing 2 rectangle on panel 35: a large-fill confirmation should appear. Cancel and verify no fill is committed.
2. Repeat and approve: the intended large background fill should be committed and Undo should remove it.
3. Switch reference to All visible layers: clicking inside the rectangle should fill normally without confirmation.
4. Check an intentional full-background fill can still be applied by approving.
5. Navigate away during a fill and ensure stale results are not committed.
6. Run `npm run build` and existing fill accuracy tests.
