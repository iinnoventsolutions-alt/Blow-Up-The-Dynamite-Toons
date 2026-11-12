/** N3.17-G packaged ARM64 isolated pipeline + output lifecycle smoke test. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {createIsolatedExportPipeline}=require('../desktop/isolated-export-pipeline.cjs');
const {createIsolatedExportOutput}=require('../desktop/isolated-export-output.cjs');
const resourcesPath=process.env.RFDR_PACKAGED_RESOURCES;
assert(resourcesPath,'RFDR_PACKAGED_RESOURCES is required');
const dir=await mkdtemp(path.join(os.tmpdir(),'rfdr-n317g-'));
const request={projectId:'packaged-fixture',width:32,height:32,fps:8,outputName:'packaged.webm'};
const owner={},controller=new AbortController(),progress=[];
let closeCalls=0;
const sessions={closeOwner:async o=>{assert.equal(o,owner);closeCalls++}};
const destination=path.join(dir,'packaged.webm');
const output=createIsolatedExportOutput({dialog:{showSaveDialog:async()=>({canceled:false,filePath:destination})},window:{},sessions});
const pipeline=createIsolatedExportPipeline({
 resourcesPath,frameCount:8,
 renderFrame:async(_,index)=>({index,timestampUs:Math.round(index*1e6/8),pixels:Uint8Array.from({length:32*32*4},(_,i)=>i%4===3?255:(index*29+i)%256)}),
 renderAudio:async()=>null
});
try{
 const encoded=await pipeline(request,{signal:controller.signal,report:v=>progress.push(v)});
 assert(encoded.length>100);
 assert.equal(progress.at(-1),1);
 assert(progress.every((v,i)=>i===0||v>=progress[i-1]));
 assert.equal(await output.save(owner,request.outputName,encoded,controller.signal),destination);
 assert.deepEqual(await readFile(destination),Buffer.from(encoded));
 const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height','-of','json',destination],{encoding:'utf8'});
 assert.equal(probe.status,0,probe.stderr);
 const info=JSON.parse(probe.stdout).streams[0];
 assert.equal(info.codec_name,'vp8');assert.equal(info.width,32);assert.equal(info.height,32);
 await output.closeWindow(owner);assert.equal(closeCalls,1);
 await assert.rejects(output.save(owner,request.outputName,encoded,controller.signal),/closed/);
 assert.deepEqual(await readdir(dir),['packaged.webm']);
 console.log('RFDR N3.17-G packaged ARM64 pipeline, WebM output, lifecycle PASS');
}finally{await rm(dir,{recursive:true,force:true})}
