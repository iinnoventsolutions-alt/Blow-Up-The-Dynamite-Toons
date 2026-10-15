export type Preferences={defaultSeconds:number;undoLevels:number;autosaveSeconds:number;guides:boolean;durationMode:'time'|'frames';iconStyle:'classic'|'updated';defaultWidth:number;defaultHeight:number;defaultFps:number;defaultLayerKind:'vector'|'bitmap';selectionMode:'individual'|'rectangle'|'lasso';gap:number;sceneDigits:number;panelDigits:number;sceneIncrement:number;rememberWorkspace:boolean;warnDeleteAudio:boolean;recoverInPitch:boolean;pitchCaptions:boolean;pngMaxEdge:number};
export const defaults:Preferences={defaultSeconds:5,undoLevels:50,autosaveSeconds:10,guides:false,durationMode:'time',iconStyle:'updated',defaultWidth:1920,defaultHeight:1080,defaultFps:24,defaultLayerKind:'vector',selectionMode:'individual',gap:0,sceneDigits:0,panelDigits:0,sceneIncrement:1,rememberWorkspace:false,warnDeleteAudio:true,recoverInPitch:true,pitchCaptions:true,pngMaxEdge:8192};
export function normalizePreferences(raw:Partial<Preferences>|null):Preferences{
 const p=raw&&typeof raw==='object'?raw:{},result={...defaults};
 const bounds={defaultSeconds:[1,60],undoLevels:[1,100],autosaveSeconds:[5,300],defaultWidth:[64,8192],defaultHeight:[64,8192],defaultFps:[1,120],gap:[0,20],sceneDigits:[0,6],panelDigits:[0,6],sceneIncrement:[1,100],pngMaxEdge:[64,8192]};
 for(const [k,[min,max]] of Object.entries(bounds)){const key=k as keyof typeof bounds,v=p[key];if(typeof v==='number'&&Number.isFinite(v))result[key]=Math.max(min,Math.min(max,Math.round(v)));}
 for(const k of ['guides','rememberWorkspace','warnDeleteAudio','recoverInPitch','pitchCaptions'] as const)if(typeof p[k]==='boolean')result[k]=p[k]!;
 result.durationMode=p.durationMode==='frames'?'frames':'time';result.iconStyle=p.iconStyle==='classic'?'classic':'updated';result.defaultLayerKind=p.defaultLayerKind==='bitmap'?'bitmap':'vector';result.selectionMode=['individual','rectangle','lasso'].includes(p.selectionMode||'')?p.selectionMode!:'individual';
 return result;
}
export function loadPreferences():Preferences{try{return normalizePreferences(JSON.parse(localStorage.getItem('innovent.preferences')||'{}'));}catch{return {...defaults};}}
export function nextName(prefix:'Scene'|'Panel',names:string[],digits:number,increment=1){
 const numbers=names.map(n=>new RegExp('^'+prefix+' (\\d+)$').exec(n)).filter(Boolean).map(m=>Number(m![1]));
 const next=(numbers.length?Math.max(...numbers):0)+increment;
 return prefix+' '+String(next).padStart(digits,'0');
}
