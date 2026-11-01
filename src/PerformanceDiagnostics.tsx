import {useEffect,useState} from 'react';
import {clearDiagnostics,diagnosticsSamples,subscribeDiagnostics,setDiagnosticsEnabled,installPerformanceObserver,exportDiagnosticsJson} from './performance-diagnostics';
const cameraTraceKey='iinnovent.rdr03.cameraTrace';
const readCameraTrace=():unknown[]=>{try{const value=JSON.parse(localStorage.getItem(cameraTraceKey)||'[]');return Array.isArray(value)?value:[];}catch{return [];}};
const downloadJson=(content:string,name:string)=>{const blob=new Blob([content],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const suffix=(label:string)=>label==='Stroke: accepted movement samples'?' samples':'ms';
export default function PerformanceDiagnostics({close}:{close:()=>void}){
 const [samples,setSamples]=useState(diagnosticsSamples);
 useEffect(()=>{setDiagnosticsEnabled(true);const stop=subscribeDiagnostics(()=>setSamples(diagnosticsSamples()));const cleanup=installPerformanceObserver();return()=>{cleanup();stop();setDiagnosticsEnabled(false);};},[]);
 return <aside role="region" aria-label="Performance diagnostics" style={{position:'fixed',bottom:16,right:16,zIndex:100000,width:385,maxWidth:'95vw',maxHeight:'65vh',overflow:'auto',background:'#12202d',color:'#f3f7fa',border:'1px solid #78a0c2',padding:14,borderRadius:10,boxShadow:'0 4px 20px #0008',fontSize:12}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong>Performance diagnostics · local only</strong><button onClick={close} aria-label="Close performance diagnostics">Close</button></div>
  <p>Repeat slow tool changes, PDF close, or paint bucket fills. Durations are in milliseconds; stroke movement samples are counts. No project content is collected.</p>
  <div style={{display:'flex',gap:8}}>
   <button onClick={()=>void navigator.clipboard.writeText(samples.map(s=>s.at+' | '+s.label+' | '+s.ms+suffix(s.label)).join('\n')).catch(()=>{})}>Copy timings</button>
   <button onClick={()=>{
    const blob=new Blob([exportDiagnosticsJson()],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='pt1b-app-diagnostics-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }}>Export JSON</button>
   <button onClick={clearDiagnostics}>Clear</button>
  </div>
  <div style={{marginTop:12,paddingTop:10,borderTop:'1px solid #405466'}}><strong>RDR-03.6 · Camera interaction diagnostics</strong><p>Clear before testing. Perform quick-release failures and one delayed-release success, then export the trace. Events are stored locally and may contain project/panel identifiers and pointer coordinates.</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button onClick={()=>{try{localStorage.removeItem(cameraTraceKey);}catch{}}}>Clear Camera Diagnostics</button><button onClick={()=>downloadJson(JSON.stringify({kind:'rdr-03.6-camera-trace',exportedAt:new Date().toISOString(),events:readCameraTrace()},null,2),'rdr-03.6-camera-diagnostics-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json')}>Export Camera Diagnostics</button></div></div>
  <div aria-live="off" style={{marginTop:8}}>{samples.length?samples.slice(0,35).map((s,i)=><div key={i} style={{borderTop:'1px solid #405466',padding:'4px 0'}}><span style={{opacity:.7}}>{s.at}</span> · <strong>{s.ms} {suffix(s.label).trim()}</strong> · {s.label}</div>):<p>Waiting for interactions…</p>}</div>
 </aside>;
}
