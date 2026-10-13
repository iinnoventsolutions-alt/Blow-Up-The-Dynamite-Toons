import { cameraAt } from './model';
import { cameraCorners, localPanelStart, type CameraPose } from './camera';
import type { Layer, Panel, Project, Stroke, Scene } from './model';
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
export function drawPanel(canvas: HTMLCanvasElement, panel: Panel, project: Project, options: { width?: number; transparent?: boolean; camera?: CameraPose; overlay?: Scene; live?: { layerId: string; stroke: Stroke } } = {}) {
  const width = options.width || Math.min(project.width, 1920), height = Math.max(1, Math.round(width * project.height / project.width));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, width, height);
  if (!options.transparent) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); }
  ctx.save();
  if (options.camera) { const c = options.camera; ctx.translate(width/2,height/2); ctx.rotate(-c.rotation*Math.PI/180); ctx.scale(c.zoom,c.zoom); ctx.translate(-c.x*width/project.width,-c.y*height/project.height); }
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
  ctx.globalAlpha = 1; ctx.restore();
  if (options.overlay && options.overlay.camera.length) {
    const start=localPanelStart(options.overlay,panel), a=cameraCorners(cameraAt(options.overlay,start,project),project), b=cameraCorners(cameraAt(options.overlay,start+panel.duration-1,project),project);
    ctx.save(); ctx.scale(width/project.width,height/project.height); ctx.lineWidth=project.width/450;
    ctx.strokeStyle='#8c90db'; a.forEach(([x,y],i)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(...b[i]);ctx.stroke();const angle=Math.atan2(b[i][1]-y,b[i][0]-x),size=project.width/90;ctx.beginPath();ctx.moveTo(...b[i]);ctx.lineTo(b[i][0]-size*Math.cos(angle-.5),b[i][1]-size*Math.sin(angle-.5));ctx.moveTo(...b[i]);ctx.lineTo(b[i][0]-size*Math.cos(angle+.5),b[i][1]-size*Math.sin(angle+.5));ctx.stroke();});
    [a,b].forEach((points,i)=>{ctx.strokeStyle=ctx.fillStyle=i?'#ef4d50':'#32c85b';ctx.beginPath();points.forEach(([x,y],n)=>n?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.stroke();const size=project.width/100;points.forEach(([x,y])=>ctx.fillRect(x-size/2,y-size/2,size,size));ctx.font=`${project.width/60}px sans-serif`;ctx.fillText(i?'OUT':'IN',points[0][0]+size,points[0][1]+size*2);});ctx.restore();
  }
}
export const canDraw = (layer?: Layer) => !!layer && layer.visible && !layer.locked;
