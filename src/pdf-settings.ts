import { allPanels, type Project } from './model.ts';
export type PdfLayout='vertical'|'horizontal'|'full'|'overview';
export type PdfSettings={name:string;layout:PdfLayout;paper:'letter'|'a4';orientation:'portrait'|'landscape';margin:number;fontSize:number;dpi:150|300;cover:boolean;sceneBreaks:boolean;dialogue:boolean;action:boolean;notes:boolean;slugging:boolean;timing:boolean;transitions:boolean;imageMode:'artwork'|'camera'|'movement';companyLogo:string;showCompanyLogo:boolean;showSoftwareLogo:boolean};
export type PdfRange={kind:'all'|'scenes'|'scene'|'panel'|'selected';sceneIds:string[];panelIds:string[];currentPanelId:string};
export const pdfDefaults:PdfSettings={name:'3 Panels Vertical',layout:'vertical',paper:'letter',orientation:'portrait',margin:24,fontSize:9,dpi:150,cover:true,sceneBreaks:false,dialogue:true,action:true,notes:true,slugging:true,timing:true,transitions:true,imageMode:'movement',companyLogo:'./innovent-logo.jpg',showCompanyLogo:true,showSoftwareLogo:true};
export const pdfPresets:PdfSettings[]=[pdfDefaults,{...pdfDefaults,name:'3 Panels Horizontal',layout:'horizontal',orientation:'landscape'},{...pdfDefaults,name:'Full page',layout:'full',orientation:'landscape'},{...pdfDefaults,name:'Overview 2 × 4',layout:'overview',orientation:'landscape',fontSize:8}];
export function normalizePdfSettings(raw:Partial<PdfSettings>):PdfSettings{
 return {...pdfDefaults,...Object.fromEntries(['cover','sceneBreaks','dialogue','action','notes','slugging','timing','transitions','showCompanyLogo','showSoftwareLogo'].map(k=>[k,typeof raw[k as keyof PdfSettings]==='boolean'?raw[k as keyof PdfSettings]:pdfDefaults[k as keyof PdfSettings]])),
 name:typeof raw.name==='string'?raw.name.slice(0,80):pdfDefaults.name,
 layout:['vertical','horizontal','full','overview'].includes(raw.layout||'')?raw.layout!:pdfDefaults.layout,
 paper:raw.paper==='a4'?'a4':'letter',orientation:raw.orientation==='landscape'?'landscape':'portrait',
 margin:Math.max(18,Math.min(54,Number(raw.margin)||24)),fontSize:Math.max(8,Math.min(14,Number(raw.fontSize)||9)),dpi:raw.dpi===300?300:150,
 imageMode:['artwork','camera','movement'].includes(raw.imageMode||'')?raw.imageMode!:pdfDefaults.imageMode,
 companyLogo:typeof raw.companyLogo==='string'&&(raw.companyLogo==='./innovent-logo.jpg'||/^data:image\/(png|jpeg|webp);base64,/.test(raw.companyLogo))&&raw.companyLogo.length<2800000?raw.companyLogo:pdfDefaults.companyLogo};
}
export function pdfEntries(project:Project,range:PdfRange){
 const entries=allPanels(project);
 return entries.filter(e=>range.kind==='all'||range.kind==='scenes'&&range.sceneIds.includes(e.scene.id)||range.kind==='scene'&&e.scene.panels.some(p=>p.id===range.currentPanelId)||range.kind==='panel'&&e.panel.id===range.currentPanelId||range.kind==='selected'&&range.panelIds.includes(e.panel.id));
}
export function pdfGeometry(s:PdfSettings){
 let [w,h]=s.paper==='a4'?[595.28,841.89]:[612,792];
 if(s.orientation==='landscape')[w,h]=[h,w];
 const cols=s.layout==='horizontal'?3:s.layout==='overview'?4:1,rows=s.layout==='vertical'?3:s.layout==='overview'?2:1;
 const gap=10,top=s.margin+58,bottom=h-s.margin-25,cw=(w-2*s.margin-gap*(cols-1))/cols,ch=(bottom-top-gap*(rows-1))/rows;
 return {w,h,cols,rows,top,cw,ch,gap};
}
