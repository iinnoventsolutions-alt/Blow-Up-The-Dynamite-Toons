/** N3.12 isolated real-project audio adapter; no production exporter wiring. */
import { audioWindows } from './audio-model.ts';
import { projectFrames, type Project } from './model.ts';
import { mixDeterministicAudio, type N33Audio } from './deterministic-audio-mixer.ts';
export type DecodedMonoAsset={sampleRate:48000;samples:Float32Array};
export type DecodeMono=(assetId:string,signal?:AbortSignal)=>Promise<DecodedMonoAsset>;
export async function mixProjectAudio(project:Project,decode:DecodeMono,signal?:AbortSignal):Promise<N33Audio|null>{
 signal?.throwIfAborted();
 const frames=projectFrames(project);
 const windows=audioWindows(project,0);
 if(!windows.length)return null;
 const cache=new Map<string,DecodedMonoAsset>();
 const clips=[];
 for(const w of windows){
  signal?.throwIfAborted();
  const id=w.clip.assetId;
  if(!project.audioAssets.some(a=>a.id===id))throw new Error('Missing audio asset: '+id);
  let asset=cache.get(id);
  if(!asset){asset=await decode(id,signal);if(asset.sampleRate!==48000||!(asset.samples instanceof Float32Array))throw new Error('Decoder must supply mono 48-kHz Float32 PCM');cache.set(id,asset);}
  const trim=Math.round(w.offset*48000);
  const available=Math.max(0,asset.samples.length-trim);
  const duration=Math.min(Math.round(w.duration*48000),available);
  if(duration<=0)continue;
  clips.push({startSeconds:w.delay,trimStartSeconds:trim/48000,durationSeconds:duration/48000,sourceSamples:asset.samples,gain:w.gain});
 }
 signal?.throwIfAborted();
 return mixDeterministicAudio({durationSeconds:frames/project.fps,sampleRate:48000,clips,signal});
}
/** Browser-side decoder using the existing project audio asset path; not invoked in production. */
export async function mixProjectAudioInBrowser(project:Project,signal?:AbortSignal):Promise<N33Audio|null>{
 const {audioBuffers}=await import('./audio-engine.ts');
 signal?.throwIfAborted();
 const buffers=await audioBuffers(project);
 signal?.throwIfAborted();
 return mixProjectAudio(project,async id=>{
  const buffer=buffers.get(id);
  if(!buffer)throw new Error('Audio media is not ready: '+id);
  const rate=48000,output=new Float32Array(Math.round(buffer.duration*rate));
  for(let i=0;i<output.length;i++){
   if((i&4095)===0)signal?.throwIfAborted();
   const pos=i*buffer.sampleRate/rate,lo=Math.floor(pos),hi=Math.min(lo+1,buffer.length-1),fraction=pos-lo;
   for(let channel=0;channel<buffer.numberOfChannels;channel++){
    const samples=buffer.getChannelData(channel);
    output[i]+=(samples[lo]*(1-fraction)+samples[hi]*fraction)/buffer.numberOfChannels;
   }
  }
  return {sampleRate:48000,samples:output};
 },signal);
}
