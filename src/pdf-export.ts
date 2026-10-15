import { jsPDF } from 'jspdf';
import { cameraAt, sceneFrames, timecode, type Project } from './model';
import { localPanelStart, cameraCorners } from './camera';
import { drawPanel, preloadImages } from './render';
import { pdfEntries, pdfGeometry, normalizePdfSettings, type PdfSettings, type PdfRange } from './pdf-settings';
import { PRODUCT_NAME } from './build-info';
let fontPromise:Promise<string>|undefined;
function fontData(){return fontPromise??=(async()=>{const r=await fetch('./fonts/StoryboardSans.ttf');if(!r.ok)throw new Error('PDF font could not be loaded.');const data=new Uint8Array(await r.arrayBuffer());let binary='';for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(binary);})().catch(e=>{fontPromise=undefined;throw e;});}
async function image(source:string){const im=new Image();im.src=source;await im.decode();return im;}
const yieldUI=()=>new Promise<void>(r=>setTimeout(r,0));
function check(signal:AbortSignal){if(signal.aborted)throw new Error('PDF export cancelled.');}
type Entry=ReturnType<typeof pdfEntries>[number];
type Slot={entry:Entry;lines:string[];continued:boolean};
type Box={x:number;y:number;w:number;h:number};
function fit(width:number,height:number,b:Box){const scale=Math.min(b.w/width,b.h/height);return {x:b.x+(b.w-width*scale)/2,y:b.y+(b.h-height*scale)/2,w:width*scale,h:height*scale};}
function slotBoxes(s:PdfSettings,x:number,y:number,w:number,h:number){
 const header=38,pad=6;
 if(s.layout==='vertical'){const iw=w*.33;return {picture:{x,y:y+header,w:iw,h:h-header},caption:{x:x+iw+8,y,w:w-iw-8,h},header:{x,y,w:iw,h:header}};}
 const imageHeight=Math.min((h-header)*.58,w*.7);
 return {picture:{x,y:y+header,w,h:imageHeight},caption:{x,y:y+header+imageHeight+pad,w,h:h-header-imageHeight-pad},header:{x,y,w,h:header}};
}
function captionLines(doc:jsPDF,entry:Entry,project:Project,s:PdfSettings,width:number){
 const result:string[]=[];
 for(const key of ['dialogue','action','notes','slugging'] as const)if(s[key]&&entry.panel[key].trim()){
  if(result.length)result.push('');
  result.push(({dialogue:'Dialogue',action:'Action',notes:'Notes',slugging:'Slugging'})[key]);
  result.push(...doc.splitTextToSize(entry.panel[key],width) as string[]);
 }
 const t=s.transitions&&project.transitions.find(t=>t.fromId===entry.panel.id);
 if(t){result.push('',...doc.splitTextToSize('Transition: '+t.type.replaceAll('-',' ')+' · '+t.direction+' · '+timecode(t.duration,project.fps),width));}
 return result;
}
function pictureCanvas(entry:Entry,project:Project,s:PdfSettings,box:Box){
 const canvas=document.createElement('canvas'),start=localPanelStart(entry.scene,entry.panel),end=start+entry.panel.duration-1;
 // Limit raster allocation for extreme project aspect ratios; fit to the print box.
 const width=Math.max(1,Math.round(Math.min(box.w*s.dpi/72,box.h*s.dpi/72*project.width/project.height,4096)));
 drawPanel(canvas,entry.panel,project,{width,camera:s.imageMode==='camera'?cameraAt(entry.scene,start,project):undefined});
 if(s.imageMode!=='movement'||!entry.scene.camera.length)return canvas;
 const frames=[...new Set([start,end,...entry.scene.camera.filter(k=>k.frame>start&&k.frame<end).map(k=>k.frame),...Array.from({length:17},(_,i)=>Math.round(start+(end-start)*i/16))])].sort((a,b)=>a-b);
 const poses=frames.map(f=>cameraAt(entry.scene,f,project));
 const corners=poses.map(p=>cameraCorners(p,project));
 const points=corners.flat(),minX=Math.min(0,...points.map(p=>p[0])),minY=Math.min(0,...points.map(p=>p[1])),maxX=Math.max(project.width,...points.map(p=>p[0])),maxY=Math.max(project.height,...points.map(p=>p[1]));
 const pad=Math.max(project.width,project.height)*.025,bounds={x:minX-pad,y:minY-pad,w:maxX-minX+2*pad,h:maxY-minY+2*pad};
 const result=document.createElement('canvas'),scale=Math.min(box.w*s.dpi/72/bounds.w,box.h*s.dpi/72/bounds.h,4096/Math.max(bounds.w,bounds.h));
 result.width=Math.max(1,Math.ceil(bounds.w*scale));result.height=Math.max(1,Math.ceil(bounds.h*scale));
 const ctx=result.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,result.width,result.height);ctx.scale(scale,scale);ctx.translate(-bounds.x,-bounds.y);ctx.drawImage(canvas,0,0,project.width,project.height);
 ctx.lineWidth=Math.max(.6*s.dpi/72/scale,project.width/450);
 const first=corners[0],last=corners.at(-1)!;
 ctx.strokeStyle='#8c90db';for(let i=0;i<4;i++){ctx.beginPath();corners.forEach((c,n)=>n?ctx.lineTo(...c[i]):ctx.moveTo(...c[i]));ctx.stroke();}
 const same=first.every((p,i)=>Math.hypot(p[0]-last[i][0],p[1]-last[i][1])<.01);
 (same?[first]:[first,last]).forEach((c,i)=>{ctx.strokeStyle=ctx.fillStyle=i?'#d93237':'#159447';ctx.beginPath();c.forEach((p,n)=>n?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.stroke();const z=3*s.dpi/72/scale;c.forEach(([x,y])=>ctx.fillRect(x-z/2,y-z/2,z,z));ctx.font=7*s.dpi/72/scale+'px sans-serif';const label=same?'IN / OUT':i?'OUT':'IN';const tx=Math.max(bounds.x+z,Math.min(bounds.x+bounds.w-ctx.measureText(label).width-z,c[0][0]+z)),ty=Math.max(bounds.y+z*3,Math.min(bounds.y+bounds.h-z,c[0][1]+z*3));ctx.fillText(label,tx,ty);});
 return result;
}
export async function createStoryboardPdf(project:Project,raw:PdfSettings,range:PdfRange,signal:AbortSignal,progress:(n:number)=>void=()=>{}){
 const s=normalizePdfSettings(raw),entries=pdfEntries(project,range);if(!entries.length)throw new Error('Choose at least one panel or scene to export.');
 const doc=new jsPDF({unit:'pt',format:s.paper,orientation:s.orientation,compress:true,putOnlyUsedFonts:true});
 const font=await fontData();check(signal);doc.addFileToVFS('StoryboardSans.ttf',font);doc.addFont('StoryboardSans.ttf','Storyboard','normal');doc.setFont('Storyboard');doc.setFontSize(s.fontSize);doc.setProperties({title:project.title,subject:'Storyboard',creator:PRODUCT_NAME});
 const g=pdfGeometry(s),boxes=slotBoxes(s,0,0,g.cw,g.ch),capacity=Math.max(1,Math.floor((boxes.caption.h-12)/(s.fontSize*1.35))),pages:Slot[][]=[];let page:Slot[]=[],prior='';
 const flush=()=>{if(page.length){pages.push(page);page=[];}};
 for(const entry of entries){
  if(s.sceneBreaks&&entry.scene.id!==prior)flush();prior=entry.scene.id;
  const lines=captionLines(doc,entry,project,s,boxes.caption.w-12);let index=0;
  do{if(page.length===g.rows*g.cols)flush();page.push({entry,lines:lines.slice(index,index+capacity),continued:index>0});index+=capacity;if(pages.length>500)throw new Error('PDF exceeds 500 pages. Choose a smaller export range.');}while(index<lines.length);
 }flush();
 if(pages.length+(s.cover?1:0)>500)throw new Error('PDF exceeds 500 pages. Choose a smaller export range.');
 const textContent=[project.title,project.subtitle,...entries.flatMap(e=>[e.scene.name,e.panel.name,...(['dialogue','action','notes','slugging'] as const).filter(k=>s[k]).map(k=>e.panel[k])])].join('');
 const unsupported=[...new Set([...textContent].filter(c=>c.codePointAt(0)!>32&&!doc.getFont().metadata.characterToGlyph(c.codePointAt(0))))];
 if(unsupported.length)throw new Error('The PDF font does not support these characters: '+unsupported.slice(0,12).join(' ')+' . Replace them before exporting.');
 const logos=await Promise.all([s.showCompanyLogo?image(s.companyLogo):null,s.showSoftwareLogo?image('./innovent-icon.png'):null]);check(signal);
 const logo=(im:HTMLImageElement|null,b:Box)=>{if(im){const f=fit(im.width,im.height,b);doc.addImage(im,'PNG',f.x,f.y,f.w,f.h,undefined,'FAST');}};
 const short=(text:string,max:number)=>{text=text.replace(/\s+/g,' ');if(doc.getTextWidth(text)<=max)return text;let t=text;while(t.length&&doc.getTextWidth(t+'…')>max)t=t.slice(0,-1);return t+'…';};
 const header=(label:string)=>{doc.setFontSize(10);doc.setTextColor('#172b43');logo(logos[0],{x:s.margin,y:s.margin,w:62,h:32});logo(logos[1],{x:g.w-s.margin-38,y:s.margin,w:38,h:32});doc.text(short(project.title,g.w-2*s.margin-134),s.margin+72,s.margin+12);doc.setFontSize(8);doc.text(short(project.subtitle,g.w-2*s.margin-134),s.margin+72,s.margin+27);doc.setDrawColor('#687584');doc.setLineWidth(.5);doc.line(s.margin,s.margin+42,g.w-s.margin,s.margin+42);doc.setFontSize(8);doc.text(label,g.w-s.margin,g.h-s.margin,{align:'right'});};
 let pageIndex=0;
 if(s.cover){
  header('Cover');let size=28,title:string[]=[],subtitle:string[]=[];
  do{doc.setFontSize(size);title=doc.splitTextToSize(project.title,g.w-2*s.margin-20);doc.setFontSize(12);subtitle=doc.splitTextToSize(project.subtitle,g.w-2*s.margin-20);if(title.length*size*1.3+subtitle.length*17+70<g.h*.6)break;size--;}while(size>10);
  const top=Math.max(s.margin+80,g.h*.22);doc.setFontSize(size);doc.text(title,s.margin+10,top,{lineHeightFactor:1.3});doc.setFontSize(12);let y=top+title.length*size*1.3+18;doc.text(subtitle,s.margin+10,y,{lineHeightFactor:1.4});y+=subtitle.length*17+30;
  doc.setFontSize(10);doc.text(entries.length+' panels · '+timecode(entries.reduce((n,e)=>n+e.panel.duration,0),project.fps)+' · '+project.fps+' fps',s.margin+10,y);
  pageIndex++;
 }
 for(let p=0;p<pages.length;p++){
  check(signal);if(pageIndex++)doc.addPage();header('Page '+(p+1)+' / '+pages.length);
  for(let i=0;i<pages[p].length;i++){
   check(signal);const slot=pages[p][i],{entry}=slot,x=s.margin+(i%g.cols)*(g.cw+g.gap),y=g.top+Math.floor(i/g.cols)*(g.ch+g.gap),b=slotBoxes(s,x,y,g.cw,g.ch);
   doc.setFontSize(8);doc.setTextColor('#172b43');
   doc.text(short(entry.scene.name+' · '+entry.panel.name+(slot.continued?' (continued)':''),b.header.w-10),b.header.x+4,b.header.y+11);
   if(s.timing){doc.setFontSize(7);doc.text(short('Panel '+timecode(entry.panel.duration,project.fps)+' · Scene '+timecode(sceneFrames(entry.scene),project.fps),b.header.w-10),b.header.x+4,b.header.y+24);}
   await preloadImages(entry.panel);check(signal);const canvas=pictureCanvas(entry,project,s,{...b.picture,w:b.picture.w-8,h:b.picture.h-8}),f=fit(canvas.width,canvas.height,{x:b.picture.x+4,y:b.picture.y+4,w:b.picture.w-8,h:b.picture.h-8});
   doc.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',f.x,f.y,f.w,f.h);
   doc.setDrawColor('#687584');doc.setLineWidth(.5);doc.rect(b.picture.x,b.picture.y,b.picture.w,b.picture.h);doc.rect(b.caption.x,b.caption.y,b.caption.w,b.caption.h);
   doc.setFontSize(s.fontSize);doc.setTextColor('#182536');if(slot.lines.length)doc.text(slot.lines,b.caption.x+6,b.caption.y+6+s.fontSize,{lineHeightFactor:1.35});
   progress((p+(i+1)/pages[p].length)/pages.length);await yieldUI();
  }
 }
 check(signal);const blob=doc.output('blob');if(blob.size>128*1024*1024)throw new Error('PDF exceeds 128 MB. Reduce artwork DPI or choose a smaller range.');return {blob,pages:pages.length+(s.cover?1:0),panels:entries.length};
}
