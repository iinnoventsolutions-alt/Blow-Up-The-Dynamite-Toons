import { uid, type Layer, type Panel, type Point, type Stroke } from './model.ts';
export type Tool = 'select' | 'brush' | 'pencil' | 'contour' | 'pencil-editor' | 'text' | 'eraser' | 'bucket' | 'shape' | 'picker' | 'hand' | 'camera' | 'select-color' | 'rotate-view';
export type ToolOptions = { selectionMode: 'individual' | 'rectangle' | 'lasso'; selectionScope: 'active' | 'visible'; smoothing: number; opacity: number; pressure: boolean; minSize: number; texture: 'solid' | 'graphite' | 'chalk'; cap: 'round' | 'butt' | 'square'; capStart: 'round' | 'butt' | 'square'; capEnd: 'round' | 'butt' | 'square'; join: 'round' | 'bevel' | 'miter'; shape: 'rectangle' | 'ellipse' | 'line'; filled: boolean; fillColor: string; gap: number; tolerance: number; fillReference: 'active' | 'visible'; font: string; fontSize: number; bold: boolean; italic: boolean; align: 'left' | 'center' | 'right'; tracking: number; lineSpacing: number; indent: number; autoKern: boolean; text: string };
export const defaultToolOptions: ToolOptions = { selectionMode:'individual',selectionScope:'active',smoothing:2,opacity:1,pressure:true,minSize:.1,texture:'solid',cap:'round',capStart:'round',capEnd:'round',join:'round',shape:'rectangle',filled:false,fillColor:'#ff8a18',gap:0,tolerance:20,fillReference:'active',font:'Arial',fontSize:48,bold:false,italic:false,align:'left',tracking:0,lineSpacing:1.2,indent:0,autoKern:true,text:'Text' };
export type Selected = { layerId: string; id: string };
export const eligibleLayers = (panel: Panel, active: string, scope: ToolOptions['selectionScope']) => panel.layers.filter(l=>l.visible&&!l.locked&&(scope==='visible'||l.id===active));
export function simplifyStroke(points:Point[],tolerance:number,size:number):Point[]{if(points.length<3)return points;const keep=new Set([0,points.length-1]),stack:[[number,number]]=[[0,points.length-1]];while(stack.length){const [first,last]=stack.pop()!,a=points[first],b=points[last],dx=b[0]-a[0],dy=b[1]-a[1];let far=-1,distance=tolerance;for(let i=first+1;i<last;i++){const p=points[i],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))),d=Math.max(Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy),Math.abs(p[2]-a[2]-(b[2]-a[2])*t)*size/2);if(d>distance){distance=d;far=i;}}if(far>=0){keep.add(far);stack.push([first,far],[far,last]);}}return points.filter((_,i)=>keep.has(i));}
export function contourFromPoints(points: Point[], size: number, startCap='round', endCap='round'): Point[] {
 if(points.length===0)return [];
 if(points.length===1){const p=points[0],r=size*p[2]/2;return Array.from({length:16},(_,i)=>[p[0]+Math.cos(i*Math.PI/8)*r,p[1]+Math.sin(i*Math.PI/8)*r,1] as Point);}
 // Offset each segment, then bevel sharp turns instead of joining both sides
 // through a long miter. At a W-shaped cusp that miter can fold the filled
 // outline across itself and produce triangular spikes.
 const segments=points.slice(1).map((p,i)=>{const a=points[i],dx=p[0]-a[0],dy=p[1]-a[1],length=Math.hypot(dx,dy)||1;return [-dy/length,dx/length] as [number,number];});
 const left:Point[]=[],right:Point[]=[];
 const add=(list:Point[],p:Point,n:[number,number],sign:number)=>list.push([p[0]+n[0]*size*p[2]/2*sign,p[1]+n[1]*size*p[2]/2*sign,1]);
 for(let i=0;i<points.length;i++){
  const p=points[i];
  if(i===0||i===points.length-1){const normal=segments[i===0?0:segments.length-1];add(left,p,normal,1);add(right,p,normal,-1);continue;}
  const before=segments[i-1],after=segments[i],dot=before[0]*after[0]+before[1]*after[1];
  if(dot<0.7){ // Sharp corners need a bevel, not a long miter or a flipped normal.
   add(left,p,before,1);add(left,p,after,1);
   add(right,p,before,-1);add(right,p,after,-1);
  }else{
   const nx=before[0]+after[0],ny=before[1]+after[1],denom=nx*after[0]+ny*after[1],factor=1/Math.max(0.7,denom);
   const offset:[number,number]=[nx*factor,ny*factor];
   add(left,p,offset,1);add(right,p,offset,-1);
  }
 }
 const a=points[0],b=points[1],z=points.at(-1)!,y=points.at(-2)!;
 const startAngle=Math.atan2(b[1]-a[1],b[0]-a[0]),endAngle=Math.atan2(z[1]-y[1],z[0]-y[0]);
 const cap=(p:Point,angle:number)=>Array.from({length:8},(_,i)=>[p[0]+Math.cos(angle-i*Math.PI/8)*size*p[2]/2,p[1]+Math.sin(angle-i*Math.PI/8)*size*p[2]/2,1] as Point);
 if(startCap==='square')for(const list of [left,right]){list[0][0]-=Math.cos(startAngle)*size*a[2]/2;list[0][1]-=Math.sin(startAngle)*size*a[2]/2;}
 if(endCap==='square')for(const list of [left,right]){list[list.length-1][0]+=Math.cos(endAngle)*size*z[2]/2;list[list.length-1][1]+=Math.sin(endAngle)*size*z[2]/2;}
 return [...left,...(endCap==='round'?cap(z,endAngle+Math.PI/2):[]),...right.reverse(),...(startCap==='round'?cap(a,startAngle-Math.PI/2):[])];
}

export const textFont = (s:Stroke) => `${s.italic?'italic ':''}${s.bold?'bold ':''}${s.fontSize||48}px "${(s.font||'Arial').replace(/["\\]/g,'')}"`;
let textMeasure:CanvasRenderingContext2D|null=null;
export function textLocalBounds(stroke:Stroke) {
 const [a,b]=stroke.points,scale=stroke.textScaleX||1,fontSize=stroke.fontSize||48,width=Math.abs(b[0]-a[0])/scale,height=Math.abs(b[1]-a[1]),anchor=stroke.align==='center'?width/2:stroke.align==='right'?width:0;
 if(typeof document!=='undefined')textMeasure ||= document.createElement('canvas').getContext('2d');
 const ctx=textMeasure;if(ctx){ctx.font=textFont(stroke);ctx.fontKerning=stroke.autoKern===false?'none':'auto';ctx.textBaseline='top';ctx.textAlign='left';}
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 (stroke.text||'').split('\n').forEach((line,row)=>{
  const chars=[...line],tracking=stroke.tracking||0,advance=ctx?(tracking?chars.reduce((n,c)=>n+ctx.measureText(c).width,0)+Math.max(0,chars.length-1)*tracking:ctx.measureText(line).width):chars.length*fontSize*.65+Math.max(0,chars.length-1)*tracking;
  let x=anchor+(row===0?(stroke.indent||0):0)-(stroke.align==='center'?advance/2:stroke.align==='right'?advance:0);const y=row*fontSize*(stroke.lineSpacing||1.2);
  const measure=(text:string)=>{const m=ctx?.measureText(text);minX=Math.min(minX,x-(m?.actualBoundingBoxLeft||0));maxX=Math.max(maxX,x+(m?.actualBoundingBoxRight??text.length*fontSize*.65));minY=Math.min(minY,y-(m?.actualBoundingBoxAscent||0));maxY=Math.max(maxY,y+(m?.actualBoundingBoxDescent??fontSize));};
  if(!line.length){minX=Math.min(minX,anchor);maxX=Math.max(maxX,anchor);minY=Math.min(minY,y);maxY=Math.max(maxY,y+fontSize);}else if(tracking){for(const c of chars){measure(c);x+=(ctx?.measureText(c).width??fontSize*.65)+tracking;}}else measure(line);
 });
 return {x:minX*scale-3,y:minY-3,width:(maxX-minX)*scale+6,height:maxY-minY+6};
}
export function bounds(stroke: Stroke) {
 if(stroke.tool==='text'){const b=textLocalBounds(stroke),a=stroke.points[0],angle=(stroke.rotation||0)*Math.PI/180,points=[[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]].map(([x,y])=>[a[0]+x*Math.cos(angle)-y*Math.sin(angle),a[1]+x*Math.sin(angle)+y*Math.cos(angle)]);const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};}
 let points=stroke.contours?.flat()||stroke.outline||stroke.points, pad=['brush','pencil','eraser','shape'].includes(stroke.tool)&&!stroke.contours?stroke.size/2:0;
 if(['text','image'].includes(stroke.tool)&&stroke.rotation){const [a,b]=stroke.points,angle=stroke.rotation*Math.PI/180;points=[[0,0],[b[0]-a[0],0],[b[0]-a[0],b[1]-a[1]],[0,b[1]-a[1]]].map(([x,y])=>[a[0]+x*Math.cos(angle)-y*Math.sin(angle),a[1]+x*Math.sin(angle)+y*Math.cos(angle),1]);}
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const p of points){minX=Math.min(minX,p[0]);minY=Math.min(minY,p[1]);maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1]);}return {x:minX-pad,y:minY-pad,width:Math.max(1,maxX-minX+2*pad),height:Math.max(1,maxY-minY+2*pad)};
}
export const pointInPolygon=(x:number,y:number,points:Point[])=>{let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const windingAt=(x:number,y:number,points:Point[])=>{let winding=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],side=(b[0]-a[0])*(y-a[1])-(x-a[0])*(b[1]-a[1]);if(a[1]<=y&&b[1]>y&&side>0)winding++;else if(a[1]>y&&b[1]<=y&&side<0)winding--;}return winding;};
export function hitStroke(stroke:Stroke,x:number,y:number,tolerance=8):boolean {
 if(stroke.tool==='eraser')return false;
 if(stroke.contours){if(stroke.tool!=='fill')return stroke.contours.reduce((n,path)=>n+windingAt(x,y,path),0)!==0;let inside=false;stroke.contours.forEach(path=>{if(pointInPolygon(x,y,path))inside=!inside;});return inside;}
 const r=bounds(stroke);if(x<r.x-tolerance||x>r.x+r.width+tolerance||y<r.y-tolerance||y>r.y+r.height+tolerance)return false;
 if(stroke.tool==='text'||stroke.tool==='image')return true;
 if(stroke.tool==='shape'&&stroke.shape!=='line') {const a=stroke.points[0],b=stroke.points[1],cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2,rx=Math.abs(a[0]-b[0])/2,ry=Math.abs(a[1]-b[1])/2;if(stroke.shape==='ellipse'){const d=Math.hypot((x-cx)/Math.max(1,rx),(y-cy)/Math.max(1,ry));return stroke.fill?d<=1:Math.abs(d-1)*Math.min(rx,ry)<=stroke.size/2+tolerance;}return !!stroke.fill||Math.min(Math.abs(x-r.x),Math.abs(x-r.x-r.width),Math.abs(y-r.y),Math.abs(y-r.y-r.height))<=stroke.size/2+tolerance;}
 for(let i=0;i<stroke.points.length;i++){const a=stroke.points[Math.max(0,i-1)],b=stroke.points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<=stroke.size*b[2]/2+tolerance)return true;}return false;
}
export function transformStroke(stroke:Stroke, cx:number,cy:number,sx:number,sy:number,dx:number,dy:number,angle=0):Stroke {
 const out=structuredClone(stroke),c=Math.cos(angle),s=Math.sin(angle);const point=(p:Point):Point=>{const x=(p[0]-cx)*sx,y=(p[1]-cy)*sy;return [cx+x*c-y*s+dx,cy+x*s+y*c+dy,p[2]];};out.points=out.points.map(point);if(out.contours)out.contours=out.contours.map(path=>path.map(point));
 if(!out.contours)out.size*=Math.sqrt(Math.abs(sx*sy));if(out.tool==='text'||out.tool==='image'){const a=out.points[0],w=stroke.points[1][0]-stroke.points[0][0],h=stroke.points[1][1]-stroke.points[0][1];out.points[1]=[a[0]+w*sx,a[1]+h*sy,1];}
 if(out.tool==='text'){out.textScaleX=(out.textScaleX||1)*sx/sy;out.rotation=(out.rotation||0)+angle*180/Math.PI;out.fontSize=(out.fontSize||48)*Math.abs(sy);}if(out.tool==='image')out.rotation=(out.rotation||0)+angle*180/Math.PI;
 // Rotated geometric shapes become an explicit outline to avoid axis-aligned distortion.
 if(out.tool==='shape'&&angle&&!stroke.outline){const [a,b]=stroke.points;const path:Point[]=stroke.shape==='ellipse'?Array.from({length:48},(_,i)=>[(a[0]+b[0])/2+Math.abs(b[0]-a[0])/2*Math.cos(i*Math.PI/24),(a[1]+b[1])/2+Math.abs(b[1]-a[1])/2*Math.sin(i*Math.PI/24),1]):[[a[0],a[1],1],[b[0],a[1],1],[b[0],b[1],1],[a[0],b[1],1]];if(stroke.shape!=='line'){out.outline=path.map(point);}}
 if(stroke.outline)out.outline=stroke.outline.map(point);return out;
}
export function selectionBounds(panel:Panel,selected:Selected[]) {const boxes=selected.flatMap(s=>{const l=panel.layers.find(l=>l.id===s.layerId),stroke=l?.strokes.find(p=>p.id===s.id);return stroke?[bounds(stroke)]:[];});if(!boxes.length)return null;const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));return {x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};}
export function editSelected(panel:Panel,selected:Selected[],fn:(s:Stroke)=>Stroke|null) {for(const l of panel.layers){if(l.locked||!l.visible)continue;const ids=new Set(selected.filter(s=>s.layerId===l.id).map(s=>s.id));l.strokes=l.strokes.flatMap(s=>{if(!ids.has(s.id))return[s];const result=fn(s);return result?[result]:[];});}}
export const cloneArtwork=(stroke:Stroke)=>({...structuredClone(stroke),id:uid()});
