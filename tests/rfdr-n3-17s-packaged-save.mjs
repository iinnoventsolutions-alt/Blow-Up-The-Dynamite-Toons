import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {createIsolatedElectronExportHarness}=require('../desktop/isolated-electron-export-harness.cjs');
const {createTrustedProjectRegistry}=require('../desktop/isolated-export-project-registry.cjs');
const resourcesPath=process.env.RFDR_PACKAGED_RESOURCES;
assert(resourcesPath,'Packaged resources required');
const dir=await mkdtemp(path.join(os.tmpdir(),'rfdr-n317s-'));
const destination=path.join(dir,'verified.webm');
const ipcMain=new EventEmitter(),handlers=new Map(),notifications=[];
ipcMain.handle=(k,h)=>handlers.set(k,h);
ipcMain.removeHandler=k=>handlers.delete(k);
let frameRequests=0,audioRequests=0,saveCalls=0;
const contents={mainFrame:{url:'file:///trusted.html'},send:(channel,request)=>{
 if(channel==='isolated-export:complete'){notifications.push(request);return}
 assert.equal(channel,'isolated-export:browser-request');
 queueMicrotask(()=>{
  const data=request.kind==='frame'
   ?{index:request.index,timestampUs:Math.round(request.index*1e6/8),
      pixels:Uint8Array.from({length:32*32*4},(_,i)=>i%4===3?255:(i+request.index*31)%256)}
   :null;
  if(request.kind==='frame')frameRequests++;else audioRequests++;
  ipcMain.emit('isolated-export:browser-reply',trusted,{token:request.token,kind:request.kind,data});
 });
}};
const window={webContents:contents},trusted={sender:contents,senderFrame:contents.mainFrame};
const registry=createTrustedProjectRegistry({inspectProject:p=>({id:p.id,width:p.width,height:p.height,fps:p.fps,frameCount:p.frameCount})});
registry.publish({id:'packaged-s',width:32,height:32,fps:8,frameCount:8});
const harness=createIsolatedElectronExportHarness({
 ipcMain,window,pageURL:'file:///trusted.html',windowIsUsable:w=>w===window,registry,resourcesPath,enabled:true,
 dialog:{showSaveDialog:async()=>{saveCalls++;return {canceled:false,filePath:destination}}}
});
try{
 const {id}=handlers.get('isolated-export:start')(trusted,{projectId:'packaged-s',width:32,height:32,fps:8,outputName:'verified.webm'});
 for(let i=0;i<160&&!notifications.some(n=>n.id===id);i++)await new Promise(r=>setTimeout(r,250));
 assert.deepEqual(notifications.find(n=>n.id===id),{id,status:'saved'});
 assert.equal(saveCalls,1);assert.equal(frameRequests,8);assert.equal(audioRequests,1);
 const bytes=await readFile(destination);assert(bytes.length>100);
 const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height','-of','json',destination],{encoding:'utf8'});
 assert.equal(probe.status,0,probe.stderr);
 const stream=JSON.parse(probe.stdout).streams[0];
 assert.equal(stream.codec_name,'vp8');assert.equal(stream.width,32);assert.equal(stream.height,32);
 assert.deepEqual(await readdir(dir),['verified.webm']);
 assert.equal(JSON.stringify(notifications).includes(destination),false);
 console.log('RFDR N3.17-S packaged FFmpeg -> trusted IPC -> main-owned save -> ffprobe PASS');
}finally{await harness.dispose();assert.equal(handlers.size,0);await rm(dir,{recursive:true,force:true})}
