/** N3.17-L bounded pull-based browser transport seam.
 * Not registered with ipcMain or exposed in preload. The browser is only
 * asked for one frame at a time; caller must authenticate the IPC sender.
 */
const MAX_FRAME_BYTES=64*1024*1024;
const MAX_AUDIO_BYTES=128*1024*1024;
function createIsolatedBrowserTransport({requestFrame,requestAudio,frameTimeoutMs=30000,audioTimeoutMs=60000}={}){
 if(typeof requestFrame!=='function'||typeof requestAudio!=='function')throw new TypeError('Transport callbacks required');
 if(!Number.isSafeInteger(frameTimeoutMs)||frameTimeoutMs<1||frameTimeoutMs>120000||
    !Number.isSafeInteger(audioTimeoutMs)||audioTimeoutMs<1||audioTimeoutMs>120000)throw new RangeError('Invalid timeout');
 let closed=false,active=false;
 const guard=()=>{if(closed)throw new Error('Transport closed');if(active)throw new Error('Concurrent browser requests rejected')};
 async function invoke(fn,args,signal,timeout){
  guard();signal?.throwIfAborted();active=true;
  let timer,abortHandler;
  const cancellation=new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(new Error('Browser response timed out')),timeout);
   if(signal){abortHandler=()=>reject(signal.reason instanceof Error?signal.reason:new Error('Export aborted'));
    signal.addEventListener('abort',abortHandler,{once:true});}
  });
  try{
   const result=await Promise.race([Promise.resolve().then(()=>fn(...args)),cancellation]);
   signal?.throwIfAborted();
   if(closed)throw new Error('Transport closed');
   return result;
  }finally{
   clearTimeout(timer);
   if(signal&&abortHandler)signal.removeEventListener('abort',abortHandler);
   active=false;
  }
 }
 return Object.freeze({
  async frame(index,width,height,fps,signal){
   if(!Number.isSafeInteger(index)||index<0||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
      width<2||height<2||width*height*4>MAX_FRAME_BYTES||!Number.isFinite(fps)||fps<1||fps>120)
    throw new RangeError('Invalid frame request');
   const frame=await invoke(requestFrame,[index,signal],signal,frameTimeoutMs);
   if(!frame||frame.index!==index||frame.timestampUs!==Math.round(index*1e6/fps)||
      !(frame.pixels instanceof Uint8Array||frame.pixels instanceof Uint8ClampedArray)||
      frame.pixels.byteLength!==width*height*4)throw new Error('Invalid browser frame response');
   return {index,timestampUs:frame.timestampUs,pixels:new Uint8Array(frame.pixels)};
  },
  async audio(signal){
   const result=await invoke(requestAudio,[signal],signal,audioTimeoutMs);
   if(result!==null&&(!result||result.sampleRate!==48000||
      !(result.samples instanceof Float32Array)||result.samples.byteLength>MAX_AUDIO_BYTES))
    throw new Error('Invalid browser audio response');
   return result===null?null:{sampleRate:48000,samples:new Float32Array(result.samples)};
  },
  close(){closed=true}
 });
}
module.exports={createIsolatedBrowserTransport};
