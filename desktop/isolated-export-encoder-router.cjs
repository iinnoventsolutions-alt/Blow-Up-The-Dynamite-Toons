/** D3.2: trusted encoder selection; not connected to active export IPC. */
const {packagedEncoder}=require('./isolated-ffmpeg.cjs');
const {probeMp4Mov}=require('./mp4-mov-runtime.cjs');

// Options are supplied by trusted desktop code, never by renderer IPC.
async function selectExportEncoder(resourcesPath,format='webm',{signal,platform=process.platform,release,run}={}){
 signal?.throwIfAborted();
 if(format==='webm'){
  const binary=packagedEncoder(resourcesPath,platform);
  signal?.throwIfAborted();
  return Object.freeze({format,binary});
 }
 if(format!=='mp4'&&format!=='mov')throw new TypeError('Invalid export format');
 const result=await probeMp4Mov(resourcesPath,{signal,platform,release,run});
 signal?.throwIfAborted();
 return Object.freeze({format,binary:result.binary});
}
module.exports={selectExportEncoder};
