/** N3.17-E isolated frame/audio-to-FFmpeg pipeline. Not registered in production Electron. */
const {createIsolatedFfmpegSink}=require('./isolated-ffmpeg-sink.cjs');
function createIsolatedExportPipeline({resourcesPath,renderFrame,renderAudio,frameCount,sinkFactory=createIsolatedFfmpegSink,maxRawBytes=512*1024*1024}={}){
 if(typeof renderFrame!=='function'||typeof renderAudio!=='function'||typeof sinkFactory!=='function')throw new TypeError('Export pipeline dependencies required');
 if(!Number.isSafeInteger(frameCount)||frameCount<1||frameCount>100000)throw new RangeError('Invalid frame count');
 return async function startExport(request,{signal,report}){
  if(!signal||typeof signal.throwIfAborted!=='function'||typeof report!=='function')throw new TypeError('Invalid export context');
  signal.throwIfAborted();
  const {width,height,fps}=request;
  const frameBytes=width*height*4;
  if(!Number.isSafeInteger(frameBytes)||frameBytes<1||frameBytes>64*1024*1024)throw new RangeError('Invalid dimensions');
  const sink=await sinkFactory({resourcesPath,width,height,fps,signal,maxRawBytes});
  try{
   signal.throwIfAborted();report(0);
   // Audio is prepared first so FFmpeg can open both inputs while video frames stream.
   signal.throwIfAborted();report((frameCount+.5)/(frameCount+1));
   const output=await sink.finish(signal);
   signal.throwIfAborted();
   if(!(output instanceof Uint8Array)||output.byteLength>512*1024*1024)throw new RangeError('Invalid encoded output');
   report(1);
   return output;
  }finally{await sink.dispose()}
 };
}
module.exports={createIsolatedExportPipeline};
