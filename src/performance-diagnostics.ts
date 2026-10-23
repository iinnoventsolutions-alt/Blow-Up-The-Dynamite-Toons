export type PerformanceSample={at:string;label:string;ms:number};
const samples:PerformanceSample[]=[];
const listeners=new Set<()=>void>();
let enabled=false;
export function diagnosticsEnabled(){return enabled;}
export function setDiagnosticsEnabled(value:boolean){enabled=value;notify();}
function notify(){for(const fn of listeners)fn();}
export function subscribeDiagnostics(fn:()=>void){listeners.add(fn);return ()=>{listeners.delete(fn);};}
export function diagnosticsSamples(){return samples.slice();}
export function exportDiagnosticsJson(){
 return JSON.stringify({schema:'iinnovent-pt1b-diagnostics-v1',capturedAt:new Date().toISOString(),
  userAgent:typeof navigator==='undefined'?'unknown':navigator.userAgent,
  samples:diagnosticsSamples()},null,2)+'\n';
}

export function clearDiagnostics(){samples.length=0;notify();}
export function recordPerformance(label:string,ms:number){if(!enabled||!Number.isFinite(ms))return;samples.unshift({at:new Date().toLocaleTimeString(),label,ms:Math.round(ms*10)/10});if(samples.length>100)samples.length=100;notify();}
export function installPerformanceObserver(){
 if(typeof window==='undefined')return()=>{};
 let observer:PerformanceObserver|undefined;
 try{
  if(PerformanceObserver.supportedEntryTypes?.includes('longtask')){
   observer=new PerformanceObserver(list=>{for(const e of list.getEntries())recordPerformance('Renderer main-thread long task',e.duration);});
   observer.observe({entryTypes:['longtask']});
  }
 }catch{}
 let lastPointer=0;
 const down=(e:PointerEvent)=>{if(!enabled)return;const target=e.target as HTMLElement|null;if(!target?.closest('button,select,input,.tool-rail,.pdf-dialog,.workspace-tabs'))return;lastPointer=performance.now();};
 const up=()=>{if(!enabled||!lastPointer)return;const started=lastPointer;lastPointer=0;requestAnimationFrame(()=>requestAnimationFrame(()=>recordPerformance('UI click to second animation frame',performance.now()-started)));};
 window.addEventListener('pointerdown',down,true);window.addEventListener('pointerup',up,true);
 return()=>{observer?.disconnect();window.removeEventListener('pointerdown',down,true);window.removeEventListener('pointerup',up,true);};
}
