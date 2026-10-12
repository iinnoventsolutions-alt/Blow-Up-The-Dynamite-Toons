import type { Layer, Panel, Project, Stroke } from './model';
const images = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<void>>();
const scratchCanvases = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
export async function preloadImages(panel: Panel): Promise<void> {
  await Promise.all(panel.layers.filter(l => l.image && !images.has(l.image)).map(l => {
    const source = l.image!;
    if (!pending.has(source)) pending.set(source, new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => { images.set(source, image); pending.delete(source); resolve(); };
      image.onerror = () => { pending.delete(source); reject(new Error('An embedded image could not be decoded.')); };
      image.src = source;
    }));
    return pending.get(source)!;
  }));
}
function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = stroke.color; ctx.fillStyle = stroke.color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const points = stroke.points;
  for (let i = 0; i < points.length; i++) {
    const p = points[i], prev = points[Math.max(0, i - 1)];
    const width = stroke.size * Math.max(0.1, (p[2] + prev[2]) / 2);
    ctx.lineWidth = width;
    if (i === 0) { ctx.beginPath(); ctx.arc(p[0], p[1], width / 2, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); }
  }
  ctx.globalCompositeOperation = 'source-over';
}
export function drawPanel(canvas: HTMLCanvasElement, panel: Panel, project: Project, options: { width?: number; transparent?: boolean; live?: { layerId: string; stroke: Stroke } } = {}) {
  const width = options.width || Math.min(project.width, 1920), height = Math.max(1, Math.round(width * project.height / project.width));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, width, height);
  if (!options.transparent) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); }
  let scratch = scratchCanvases.get(canvas);
  if (!scratch) { scratch = document.createElement('canvas'); scratchCanvases.set(canvas, scratch); }
  if (scratch.width !== width || scratch.height !== height) { scratch.width = width; scratch.height = height; }
  const layerCtx = scratch.getContext('2d')!;
  for (const layer of panel.layers) {
    if (!layer.visible) continue;
    layerCtx.setTransform(1, 0, 0, 1, 0, 0); layerCtx.clearRect(0, 0, width, height); layerCtx.scale(width / project.width, height / project.height);
    if (layer.image && images.has(layer.image)) {
      const image = images.get(layer.image)!; const scale = Math.min(project.width / image.width, project.height / image.height);
      layerCtx.drawImage(image, (project.width - image.width * scale) / 2, (project.height - image.height * scale) / 2, image.width * scale, image.height * scale);
    }
    for (const stroke of layer.strokes) paintStroke(layerCtx, stroke);
    if (options.live?.layerId === layer.id) paintStroke(layerCtx, options.live.stroke);
    ctx.globalAlpha = layer.opacity; ctx.drawImage(scratch, 0, 0);
  }
  ctx.globalAlpha = 1;
}
export const canDraw = (layer?: Layer) => !!layer && layer.visible && !layer.locked;
