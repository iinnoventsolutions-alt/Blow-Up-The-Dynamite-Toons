import type { Panel } from './model.ts';

/** Resolve whether a panel can draw without loading a new embedded image. */
export function panelImagesReady(panel: Panel, decoded: ReadonlySet<string>): boolean {
  return panel.layers.every(layer =>
    (!layer.image || decoded.has(layer.image)) &&
    layer.strokes.every(stroke => stroke.tool !== 'image' || !stroke.source || decoded.has(stroke.source))
  );
}
