import { contourFromPoints, textFont } from './artwork';
import { panelImagesReady as imagesReady } from './image-readiness';
import { cameraAt } from './model';
import { cameraCorners, localPanelStart, type CameraPose } from './camera';
import type { Layer, Panel, Project, Stroke, Scene } from './model';
const images = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<void>>();
const scratchCanvases = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
/** True only when every embedded image used by this panel has decoded. */
export function panelImagesReady(panel: Panel): boolean {
  return imagesReady(panel, images);
}
export async function preloadImages(panel: Panel): Promise<void> {
  await Promise.all(panel.layers.flatMap(l=>[l.image,...l.strokes.filter(s=>s.tool==='image').map(s=>s.source)]).filter((source):source is string=>!!source&&!images.has(source)).map(source => {
    if (!pending.has(source)) pending.set(source, new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => { images.set(source, image); pending.delete(source); resolve(); };
      image.onerror = () => { pending.delete(source); reject(new Error('An embedded image could not be decoded.')); };
      image.src = source;
    }));
    return pending.get(source)!;
  }));
}
const textureTiles=new Map<string,HTMLCanvasElement>();
function texturePaint(ctx:CanvasRenderingContext2D,stroke:Stroke):CanvasPattern|string {if(!stroke.texture||stroke.texture==='solid')return stroke.color;const key=`${stroke.color}:${stroke.texture}`;let tile=textureTiles.get(key);if(!tile){tile=document.createElement('canvas');tile.width=tile.height=32;const t=tile.getContext('2d')!;const rgb=[1,3,5].map(i=>parseInt(stroke.color.slice(i,i+2),16));const pixels=t.createImageData(32,32);let seed=1789;for(let i=0;i<1024;i++){seed=(seed*1664525+1013904223)>>>0;pixels.data.set([...rgb,stroke.texture==='chalk'?(seed%5?220:30):60+seed%196],i*4);}t.putImageData(pixels,0,0);textureTiles.set(key,tile);}const pattern=ctx.createPattern(tile,'repeat');pattern?.setTransform(new DOMMatrix().scale(Math.max(.1,stroke.size/32)));return pattern||stroke.color;}
export function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
 ctx.save();ctx.globalAlpha=stroke.opacity??1;ctx.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';ctx.strokeStyle=ctx.fillStyle=texturePaint(ctx,stroke);ctx.lineCap=stroke.cap||'round';ctx.lineJoin=stroke.join||'round';
 const path=(points:Stroke['points'],close=true)=>{points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));if(close)ctx.closePath();};
 if(stroke.tool==='text'){const [a,b]=stroke.points;ctx.translate(a[0],a[1]);ctx.rotate((stroke.rotation||0)*Math.PI/180);ctx.scale(stroke.textScaleX||1,1);ctx.fontKerning=stroke.autoKern===false?'none':'auto';ctx.font=textFont(stroke);ctx.textBaseline='top';ctx.textAlign=stroke.align||'left';const width=Math.abs(b[0]-a[0])/(stroke.textScaleX||1);const anchor=stroke.align==='center'?width/2:stroke.align==='right'?width:0;let row=0;for(const line of (stroke.text||'').split('\n')){if(!stroke.tracking)ctx.fillText(line,anchor+(row===0?(stroke.indent||0):0),row*(stroke.fontSize||48)*(stroke.lineSpacing||1.2));else{const chars=[...line],total=chars.reduce((n,c)=>n+ctx.measureText(c).width,0)+(chars.length-1)*(stroke.tracking||0);let x=anchor+(row===0?(stroke.indent||0):0)-(stroke.align==='center'?total/2:stroke.align==='right'?total:0);ctx.textAlign='left';for(const c of chars){ctx.fillText(c,x,row*(stroke.fontSize||48)*(stroke.lineSpacing||1.2));x+=ctx.measureText(c).width+(stroke.tracking||0);}}row++;}}
 else if(stroke.tool==='image'){const im=images.get(stroke.source!);if(im){const [a,b]=stroke.points;ctx.translate(a[0],a[1]);ctx.rotate((stroke.rotation||0)*Math.PI/180);ctx.drawImage(im,0,0,b[0]-a[0],b[1]-a[1]);}}
 else if(stroke.contours||stroke.tool==='brush'||stroke.tool==='fill') {ctx.beginPath();for(const contour of stroke.contours||[contourFromPoints(stroke.points,stroke.size)])path(contour);ctx.fill(stroke.tool==='fill'?'evenodd':'nonzero');}
 else if(stroke.tool==='shape'){ctx.beginPath();const [a,b]=stroke.points;if(stroke.outline)path(stroke.outline);else if(stroke.shape==='ellipse')ctx.ellipse((a[0]+b[0])/2,(a[1]+b[1])/2,Math.abs(b[0]-a[0])/2,Math.abs(b[1]-a[1])/2,0,0,Math.PI*2);else if(stroke.shape==='line')path(stroke.points,false);else ctx.rect(Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));if(stroke.fill){ctx.fillStyle=stroke.fill;ctx.fill();}ctx.lineWidth=stroke.size;ctx.stroke();}
 else {const points=stroke.points,start=stroke.capStart||stroke.cap||'round',end=stroke.capEnd||stroke.cap||'round';if(points.length>1&&points.every(p=>p[2]===points[0][2])){ctx.lineCap='butt';ctx.lineWidth=stroke.size*points[0][2];ctx.beginPath();path(points,false);ctx.stroke();for(const [p,q,cap] of [[points[0],points[1],start],[points.at(-1)!,points.at(-2)!,end]] as const){const r=stroke.size*p[2]/2,a=Math.atan2(p[1]-q[1],p[0]-q[0]);ctx.save();ctx.translate(p[0],p[1]);ctx.rotate(a);ctx.beginPath();if(cap==='round'){ctx.arc(0,0,r,-Math.PI/2,Math.PI/2);ctx.closePath();ctx.fill();}else if(cap==='square')ctx.fillRect(0,-r,r,r*2);ctx.restore();}}else{ctx.beginPath();path(contourFromPoints(points,stroke.size,start,end));ctx.fill();}}

 ctx.restore();
}
export function paintLayer(ctx:CanvasRenderingContext2D,layer:Layer,project:Project,live?:Stroke){
 if(layer.image&&images.has(layer.image)){const im=images.get(layer.image)!,scale=Math.min(project.width/im.width,project.height/im.height);ctx.drawImage(im,(project.width-im.width*scale)/2,(project.height-im.height*scale)/2,im.width*scale,im.height*scale);}
 for(const s of layer.strokes)paintStroke(ctx,s);if(live)paintStroke(ctx,live);
}
export function layerCanvas(layer:Layer,project:Project,width=project.width){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.max(1,Math.round(width*project.height/project.width));const ctx=canvas.getContext('2d')!;ctx.scale(width/project.width,canvas.height/project.height);paintLayer(ctx,layer,project);return canvas;}
export async function flattenLayer(layer:Layer,project:Project):Promise<Layer>{await preloadImages({layers:[layer]} as Panel);if(project.width*project.height>16777216)throw new Error('Bitmap editing supports up to 16 megapixels. Use a smaller project or a Vector layer.');const canvas=layerCanvas(layer,project);return {...layer,kind:'bitmap',image:canvas.toDataURL('image/png'),strokes:[]};}
export function drawPanel(canvas: HTMLCanvasElement, panel: Panel, project: Project, options: { width?: number; transparent?: boolean; camera?: CameraPose; overlay?: Scene; live?: { layerId: string; stroke: Stroke }; drawingMargin?: number } = {}) {
  const margin = options.drawingMargin || 0;
  const width = options.width || Math.min(Math.round(project.width * (1 + 2 * margin)), 2400), height = Math.max(1, Math.round(width * project.height / project.width));
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
    layerCtx.setTransform(1, 0, 0, 1, 0, 0); layerCtx.clearRect(0, 0, width, height); layerCtx.scale(width / (project.width * (1 + 2 * margin)), height / (project.height * (1 + 2 * margin))); if (margin) layerCtx.translate(project.width * margin, project.height * margin);
    paintLayer(layerCtx,layer,project,options.live?.layerId===layer.id?options.live.stroke:undefined);
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
