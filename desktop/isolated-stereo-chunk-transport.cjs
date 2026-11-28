/** Opt-in sequential stereo transport. No production activation. */
const CHUNK=48000,MAX=28800000;
function createStereoChunkTransport(request){
 if(typeof request!=='function')throw new TypeError('Stereo request callback required');
 let active=false,closed=false,started=false,total=0,next=0;
 async function invoke(kind,data,signal,validate){
  if(closed||active)throw new Error('Stereo transport unavailable');
  signal?.throwIfAborted();active=true;
  try{
   const reply=await request(kind,data,signal);
   signal?.throwIfAborted();
   if(closed)throw new Error('Stereo transport closed');
   return validate(reply);
  }catch(error){closed=true;throw error}
  finally{active=false}
 }
 return Object.freeze({
  async begin(expectedFrames,signal){
   if(started||!Number.isSafeInteger(expectedFrames)||expectedFrames<1||expectedFrames>MAX)throw new RangeError('Invalid stereo session');
   return invoke('stereo-begin',{totalFrames:expectedFrames},signal,result=>{
    if(result!==null&&(!result||result.sampleRate!==48000||result.channels!==2||result.totalFrames!==expectedFrames))throw new Error('Invalid stereo metadata');
    started=true;total=result===null?0:expectedFrames;
    return result===null?null:{sampleRate:48000,channels:2,totalFrames:total};
   });
  },
  async read(startFrame,signal){
   if(!started||startFrame!==next||next>=total)throw new RangeError('Invalid stereo sequence');
   const count=Math.min(CHUNK,total-next);
   return invoke('stereo-chunk',{startFrame},signal,result=>{
    if(!result||result.sampleRate!==48000||result.channels!==2||result.startFrame!==startFrame||result.frameCount!==count||!(result.samples instanceof Float32Array)||result.samples.length!==count*2)throw new Error('Invalid stereo chunk');
    const samples=new Float32Array(result.samples);
    for(const sample of samples)if(!Number.isFinite(sample))throw new Error('Invalid stereo sample');
    next+=count;
    return {sampleRate:48000,channels:2,startFrame,frameCount:count,samples};
   });
  },
  close(){closed=true}
 });
}
module.exports={createStereoChunkTransport};
