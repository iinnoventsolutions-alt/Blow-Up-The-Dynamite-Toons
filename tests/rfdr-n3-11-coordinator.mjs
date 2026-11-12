import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/isolated-export-coordinator.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {runIsolatedExport}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const frame=(i,fps=8)=>({index:i,timestampUs:Math.round(i*1e6/fps),pixels:new Uint8Array(4)});
const make=()=>{const calls=[];let active=0,maxActive=0,disposed=0;
 const sink={async writeFrame(f){active++;maxActive=Math.max(maxActive,active);await Promise.resolve();calls.push('frame:'+f.index);active--;},async writeAudio(a){calls.push(a?'audio':'silent');},async finish(){calls.push('finish');return new Uint8Array([1]);},async dispose(){disposed++;calls.push('dispose');}};
 return {calls,sink,get maxActive(){return maxActive},get disposed(){return disposed}};
};
const base=(m,signal=new AbortController().signal)=>({frameCount:3,fps:8,renderFrame:async i=>frame(i),renderAudio:async()=>null,sink:m.sink,signal});
{
 const m=make(),progress=[];const out=await runIsolatedExport({...base(m),onProgress:p=>progress.push(p)});
 assert.deepEqual([...out],[1]);assert.deepEqual(m.calls,['frame:0','frame:1','frame:2','silent','finish','dispose']);assert.equal(m.maxActive,1);assert.equal(m.disposed,1);assert.equal(progress.at(-1),1);assert(progress.every((p,i)=>i===0||p>=progress[i-1]));
}
{
 const m=make();await runIsolatedExport({...base(m),renderAudio:async()=>({sampleRate:48000,samples:new Float32Array(48000)})});
 assert(m.calls.includes('audio'));assert.equal(m.disposed,1);
}
{
 const m=make(),controller=new AbortController();
 await assert.rejects(runIsolatedExport({...base(m,controller.signal),renderFrame:async i=>{if(i===1)controller.abort();return frame(i)}}),/abort/i);
 assert.equal(m.disposed,1);assert(!m.calls.includes('finish'));
}
{
 const m=make();await assert.rejects(runIsolatedExport({...base(m),renderFrame:async i=>{if(i===1)throw Error('render failed');return frame(i)}}),/render failed/);
 assert.equal(m.disposed,1);
}
{
 const m=make();await assert.rejects(runIsolatedExport({...base(m),renderFrame:async i=>({...frame(i),timestampUs:0})}),/timestamp mismatch/);
 assert.equal(m.disposed,1);
}
console.log('RFDR N3.11 isolated coordinator contracts PASS');
