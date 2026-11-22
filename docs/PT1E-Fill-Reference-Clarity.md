# PT.1E — Paint bucket fill-reference clarity

The bucket properties now identify Fill reference as the **boundary source**. The contextual helper text explains that **Active layer** ignores outlines on other layers, whereas **All visible layers** can use those outlines for boundaries; the fill is still placed on the selected layer. A short recovery hint explains how to undo an unexpected large fill.

This is a UI-only clarification: no fill algorithms, defaults, or drawing data have changed. The optional large-fill detection/preview is deferred pending a separate design and regression test because it must not interrupt intentional background fills.

Validation to run locally: `npm run build`; manually verify both helper texts, active-layer behavior, all-visible-layer behavior, and Undo after a large fill.
