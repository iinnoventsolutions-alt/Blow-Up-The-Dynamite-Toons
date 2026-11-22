import type { Layer, Panel } from './model.ts';

/** Bitmap work required by a drawing commit. A vector-only fill cannot edit
 * bitmap pixels, so its unchanged bitmap layers require no JSON comparison.
 * All other callers retain deep content comparison (including cloned layers).
 */
export function changedBitmapIds(previous: Panel, next: Panel, vectorOnlyFillLayerId?: string): Set<string> {
  if (vectorOnlyFillLayerId) {
    const before = previous.layers.find(l => l.id === vectorOnlyFillLayerId);
    const after = next.layers.find(l => l.id === vectorOnlyFillLayerId);
    if (before?.kind === 'vector' && after?.kind === 'vector' &&
        previous.layers.length === next.layers.length &&
        previous.layers.every((layer, i) => layer.id === next.layers[i].id && layer.kind === next.layers[i].kind)) {
      return new Set();
    }
  }
  const prior = new Map<string, Layer>(previous.layers.map(layer => [layer.id, layer]));
  const changed = new Set<string>();
  for (const layer of next.layers) {
    if (layer.kind === 'bitmap' && JSON.stringify(prior.get(layer.id)) !== JSON.stringify(layer)) changed.add(layer.id);
  }
  return changed;
}
