import {useEffect,useState} from 'react';
import {clearDiagnostics,diagnosticsSamples,subscribeDiagnostics,setDiagnosticsEnabled,installPerformanceObserver} from './performance-diagnostics';
const suffix=(label:string)=>label==='Stroke: accepted movement samples'?' samples':'ms';
export default function PerformanceDiagnostics({close}:{close:()=>void}){
 const [samples,setSamples]=useState(diagnosticsSamples);
 useEffect(()=>{setDiagnosticsEnabled(true);const stop=subscribeDiagnostics(()=>setSamples(diagnosticsSamples()));const cleanup=installPerformanceObserver();return()=>{cleanup();stop();setDiagnosticsEnabled(false);};},[]);
 return <aside role="region" aria-label="Performance diagnostics" style={{position:'fixed',bottom:16,right:16,zIndex:100000,width:385,maxWidth:'95vw',maxHeight:'65vh',overflow:'auto',background:'#12202d',color:'#f3f7fa',border:'1px solid #78a0c2',padding:14,borderRadius:10,boxShadow:'0 4px 20px #0008',fontSize:12}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong>Performance diagnostics · local only</strong><button onClick={close} aria-label="Close performance diagnostics">Close</button></div>
  <p>Repeat slow tool changes, PDF close, or paint bucket fills. Durations are in milliseconds; stroke movement samples are counts. No project content is collected.</p>
  <div style={{display:'flex',gap:8}}>
   <button onClick={()=>void navigator.clipboard.writeText(samples.map(s=>s.at+' | '+s.label+' | '+s.ms+suffix(s.label)).join('\n')).catch(()=>{})}>Copy timings</button>
   <button onClick={clearDiagnostics}>Clear</button>
  </div>
  <div aria-live="off" style={{marginTop:8}}>{samples.length?samples.slice(0,35).map((s,i)=><div key={i} style={{borderTop:'1px solid #405466',padding:'4px 0'}}><span style={{opacity:.7}}>{s.at}</span> · <strong>{s.ms} {suffix(s.label).trim()}</strong> · {s.label}</div>):<p>Waiting for interactions…</p>}</div>
 </aside>;
}
