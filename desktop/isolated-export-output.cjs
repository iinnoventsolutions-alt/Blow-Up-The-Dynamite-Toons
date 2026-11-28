/** N3.17-F isolated output/lifecycle boundary. Not wired to production Electron. */
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {constants}=require('node:fs');
function createIsolatedExportOutput({dialog,window,sessions,writeFs=fs,formatPolicy}={}){
 if(!dialog||typeof dialog.showSaveDialog!=='function'||!sessions||typeof sessions.closeOwner!=='function')throw new TypeError('Output dependencies required');
 let closed=false;
 const active=new Set();
 async function save(owner,outputName,bytes,signal,format='webm'){
  if(closed)throw new Error('Export window closed');
  if(!owner||typeof owner!=='object'||!signal||typeof signal.throwIfAborted!=='function')throw new TypeError('Invalid export owner or signal');
  if(!['webm','mp4','mov'].includes(format)|| (format!=='webm'&&formatPolicy?.capabilities?.[format]!==true))throw new TypeError('Export format unavailable');
  if(format!=='webm'){
   if(typeof outputName!=='string'||outputName.length>100||! /^[a-zA-Z0-9][a-zA-Z0-9 _.-]*\.(mp4|mov)$/.test(outputName)||!outputName.endsWith('.'+format)||outputName.includes('..'))throw new TypeError('Invalid output name');
  }else if(typeof outputName!=='string'||!/^[a-zA-Z0-9 _.-]{1,100}\.webm$/i.test(outputName)||outputName.startsWith('.'))throw new TypeError('Invalid output name');
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>512*1024*1024)throw new RangeError('Invalid output bytes');
  signal.throwIfAborted();
  const operation={controller:new AbortController()};
  active.add(operation);
  let staging;
  try{
   const result=await dialog.showSaveDialog(window,{defaultPath:outputName,filters:[{name:format==='webm'?'WebM Video':format==='mp4'?'MP4 Video':'QuickTime Movie',extensions:[format]}]});
   if(closed||operation.controller.signal.aborted)throw new Error('Export window closed');
   signal.throwIfAborted();
   if(result.canceled||!result.filePath)return null;
   const destination=result.filePath;
   if(path.extname(destination).toLowerCase()!=='.'+format)throw new Error('Output destination must be .'+format);
   staging=path.join(path.dirname(destination),'.'+crypto.randomUUID()+'.'+format+'.tmp');
   await writeFs.writeFile(staging,bytes,{flag:'wx',mode:0o600});
   if(closed||operation.controller.signal.aborted)throw new Error('Export window closed');
   signal.throwIfAborted();
   // EXCL avoids silently overwriting a file changed since the dialog selection.
   await writeFs.copyFile(staging,destination,constants.COPYFILE_EXCL);
   return destination;
  }finally{
   if(staging)await writeFs.rm(staging,{force:true});
   active.delete(operation);
  }
 }
 async function closeWindow(owner){
  closed=true;
  for(const operation of active)operation.controller.abort();
  await sessions.closeOwner(owner);
 }
 return Object.freeze({save,closeWindow});
}
module.exports={createIsolatedExportOutput};
