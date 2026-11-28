/** N3.17-E isolated frame/audio-to-FFmpeg pipeline. Not registered in production Electron. */
const {createIsolatedFfmpegSink}=require('./isolated-ffmpeg-sink.cjs');
function createIsolatedExportPipeline({resourcesPath,renderFrame,renderAudio,frameCount,sinkFactory=createIsolatedFfmpegSink,maxRawBytes=512*1024*1024}={}){
 if(typeof renderFrame!=='function'||typeof renderAudio!=='function'||typeof sinkFactory!=='function')throw new TypeError('Export pipeline dependencies required');
 if(!Number.isSafeInteger(frameCount)||frameCount<1||frameCount>100000)throw new RangeError('Invalid frame count');
 return async function startExport(request,{signal,report}){
  if(!signal||typeof signal.throwIfAborted!=='function'||typeof report!=='function')throw new TypeError('Invalid export context');
  signal.throwIfAborted();
  const {width,height,fps,format='webm'}=request;
  if(!['webm','mp4','mov'].includes(format))throw new TypeError('Invalid export format');
  if(format!=='webm'&&(width%2||height%2))throw new RangeError('MP4/MOV requires even dimensions');
  const frameBytes=width*height*4;
  if(!Number.isSafeInteger(frameBytes)||frameBytes<1||frameBytes>64*1024*1024)throw new RangeError('Invalid dimensions');
  const sink=await sinkFactory({resourcesPath,width,height,fps,signal,maxRawBytes,...(format==='webm'?{}:{format})});
  try{
   signal.throwIfAborted();report(0);
   const audio=await renderAudio(request,signal);
   signal.throwIfAborted();
   if(audio!==null&&(!audio||audio.sampleRate!==48000||!(audio.samples instanceof Float32Array)||audio.samples.byteLength>128*1024*1024||audio.samples.byteLength>maxRawBytes))throw new RangeError('Invalid audio or raw disk budget');
   await sink.writeAudio(audio,signal);
   for(let index=0;index<frameCount;index++){
    signal.throwIfAborted();
    const frame=await renderFrame(request,index,signal);
    signal.throwIfAborted();
    if(!frame||frame.index!==index||frame.timestampUs!==Math.round(index*1e6/fps)||!(frame.pixels instanceof Uint8Array)||frame.pixels.byteLength!==frameBytes)throw new Error('Invalid frame sequence or RGBA size');
    await sink.writeFrame(frame,signal);
    signal.throwIfAborted();report((index+1)/(frameCount+1));
   }
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
