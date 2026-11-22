/** N3.17-O packaged FFmpeg with full isolated IPC composition.
 * Uses actual packaged ARM64 encoder, mocked Electron event delivery.
 * Does NOT launch Electron or exercise production UI/preload.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {createIsolatedElectronExportHarness}=require('../desktop/isolated-electron-export-harness.cjs');
const {createTrustedProjectRegistry}=require('../desktop/isolated-export-project-registry.cjs');
const resourcesPath=process.env.RFDR_PACKAGED_RESOURCES;
assert(resourcesPath,'Packaged resources required');
const ipcMain=new EventEmitter(),handlers=new Map();
ipcMain.handle=(channel,handler)=>{assert(!handlers.has(channel));handlers.set(channel,handler)};
ipcMain.removeHandler=channel=>handlers.delete(channel);
let frameRequests=0,audioRequests=0;
const webContents={mainFrame:{url:'file:///trusted.html'},send:(channel,request)=>{
 assert.equal(channel,'isolated-export:browser-request');
 queueMicrotask(()=>{
  const data=request.kind==='frame'
   ?{index:request.index,timestampUs:Math.round(request.index*1e6/8),
      pixels:Uint8ClampedArray.from({length:32*32*4},(_,i)=>i%4===3?255:(i+request.index*31)%256)}
   :null;
  if(request.kind==='frame')frameRequests++;else audioRequests++;
  ipcMain.emit('isolated-export:browser-reply',trustedEvent,{token:request.token,kind:request.kind,data});
 });
}};
const window={webContents},trustedEvent={sender:webContents,senderFrame:webContents.mainFrame};
const registry=createTrustedProjectRegistry({inspectProject:p=>({id:p.id,width:p.width,height:p.height,fps:p.fps,frameCount:p.frameCount})});
registry.publish({id:'packaged1',width:32,height:32,fps:8,frameCount:8});
const harness=createIsolatedElectronExportHarness({ipcMain,window,pageURL:'file:///trusted.html',windowIsUsable:w=>w===window,registry,resourcesPath,enabled:true});
const dir=await mkdtemp(path.join(os.tmpdir(),'rfdr-n317o-'));
try{
 const request={projectId:'packaged1',width:32,height:32,fps:8,outputName:'packaged.webm'};
 const start=handlers.get('isolated-export:start');
 assert.equal(typeof start,'function');
 const {id}=start(trustedEvent,request);
 let result;
 for(let attempt=0;attempt<120;attempt++){
  await new Promise(resolve=>setTimeout(resolve,250));
  let status;
  try{status=handlers.get('isolated-export:progress')(trustedEvent,id)}
  catch(error){if(/Unknown or unauthorized export session/.test(error.message))break;throw error}
  if(status===null||status?.state==='done'||status?.status==='done')break;
 }
 // The session coordinator deliberately drops completed bytes; validate
 // end-to-end encoding through a separate captured backend in later wiring.
 assert.equal(frameRequests,8);
 assert.equal(audioRequests,1);
 assert.throws(()=>handlers.get('isolated-export:progress')(trustedEvent,id),/Unknown or unauthorized export session/);
 assert.equal(handlers.size,3);
 console.log('RFDR N3.17-O packaged encoder + isolated IPC composition completed (session bytes not yet retrievable)');
}finally{
 await harness.dispose();
 assert.equal(handlers.size,0);
 assert.equal(ipcMain.listenerCount('isolated-export:browser-reply'),0);
 await rm(dir,{recursive:true,force:true});
}
