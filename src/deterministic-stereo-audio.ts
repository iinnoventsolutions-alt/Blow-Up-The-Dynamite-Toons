/** D3.3-D3.1: opt-in stereo mixer; not connected to existing export routes. */
import {audioWindows} from './audio-model.ts';
import {projectFrames,type Project} from './model.ts';
export type StereoSource=Pick<AudioBuffer,'sampleRate'|'length'|'numberOfChannels'|'getChannelData'>;
export type StereoClip={source:StereoSource;startSeconds:number;trimStartSeconds:number;durationSeconds:number;gain?:number};
export type StereoPCM={sampleRate:48000;channels:2;samples:Float32Array;durationSeconds:number};
const RATE=48000;
const MAX_BYTES=128*1024*1024;
function frames(seconds:number){
 if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Invalid audio time');
 const n=Math.round(seconds*RATE);
 if(!Number.isSafeInteger(n))throw new RangeError('Invalid audio frame count');
 return n;
}
function mixStereoRange(total:number,clips:readonly StereoClip[],offset:number,length:number,signal?:AbortSignal):StereoPCM{
 signal?.throwIfAborted();
 const samples=new Float32Array(length*2);
 for(const clip of clips){
  signal?.throwIfAborted();
  const s=clip.source;
  if(!Number.isFinite(s.sampleRate)||s.sampleRate<=0||!Number.isSafeInteger(s.length)||s.length<1||![1,2].includes(s.numberOfChannels))throw new RangeError('Stereo mixer requires mono or stereo source');
  const left=s.getChannelData(0),right=s.numberOfChannels===2?s.getChannelData(1):left;
  if(!(left instanceof Float32Array)||!(right instanceof Float32Array)||left.length!==s.length||right.length!==s.length)throw new TypeError('Invalid source channels');
  const start=frames(clip.startSeconds),trim=frames(clip.trimStartSeconds),duration=frames(clip.durationSeconds),gain=clip.gain??1;
  if(!Number.isFinite(gain)||gain<0)throw new RangeError('Invalid gain');
  const available=Math.max(0,frames(s.length/s.sampleRate)-trim);
  const count=Math.min(duration,available,Math.max(0,total-start));
  for(let i=Math.max(0,offset-start);i<Math.min(count,offset+length-start);i++){
   if((i&4095)===0)signal?.throwIfAborted();
   const pos=Math.min(s.length-1,(trim+i)*s.sampleRate/RATE),lo=Math.floor(pos),hi=Math.min(lo+1,s.length-1),f=pos-lo;
   const l=(left[lo]*(1-f)+left[hi]*f)*gain,r=(right[lo]*(1-f)+right[hi]*f)*gain;
   const index=(start+i-offset)*2;
   samples[index]+=l;samples[index+1]+=r;
   if(!Number.isFinite(samples[index])||!Number.isFinite(samples[index+1]))throw new RangeError('Invalid mixed audio sample');
  }
 }
 signal?.throwIfAborted();
 return {sampleRate:48000,channels:2,samples,durationSeconds:length/RATE};
}
async function prepareProjectStereo(project:Project,decode:(id:string,signal?:AbortSignal)=>Promise<StereoSource>,maxFrames:number,signal?:AbortSignal){
 signal?.throwIfAborted();
 const windows=audioWindows(project,0);
 if(!windows.length)return null;
 const duration=projectFrames(project)/project.fps;
 if(frames(duration)>maxFrames)throw new RangeError('Stereo PCM exceeds duration budget');
 const cache=new Map<string,StereoSource>(),clips:StereoClip[]=[];
 for(const w of windows){
  signal?.throwIfAborted();
  const id=w.clip.assetId;
  if(!project.audioAssets.some(a=>a.id===id))throw new Error('Missing audio asset');
  let source=cache.get(id);
  if(!source){source=await decode(id,signal);signal?.throwIfAborted();cache.set(id,source);}
  clips.push({source,startSeconds:w.delay,trimStartSeconds:w.offset,durationSeconds:w.duration,gain:w.gain});
 }
 return {duration,clips};
}
export async function mixProjectStereoAudioInBrowser(project:Project,signal?:AbortSignal):Promise<StereoPCM|null>{
 signal?.throwIfAborted();
 if(!audioWindows(project,0).length)return null;
 if(frames(projectFrames(project)/project.fps)>Math.floor(MAX_BYTES/8))throw new RangeError('Stereo PCM exceeds 128 MiB budget');
 const {audioBuffers}=await import('./audio-engine.ts');
 const buffers=await audioBuffers(project);
 signal?.throwIfAborted();
 return mixProjectStereoAudio(project,async id=>{
  const buffer=buffers.get(id);
  if(!buffer)throw new Error('Audio media is not ready');
  return buffer;
 },signal);
}

export function mixStereoAudio(durationSeconds:number,clips:readonly StereoClip[],signal?:AbortSignal):StereoPCM|null{
 signal?.throwIfAborted();
 const total=frames(durationSeconds);
 if(!clips.length)return null;
 if(total>Math.floor(MAX_BYTES/8))throw new RangeError('Stereo PCM exceeds 128 MiB budget');
 return mixStereoRange(total,clips,0,total,signal);
}
export const STEREO_CHUNK_FRAMES=48000;
export const STEREO_MAX_FRAMES=28_800_000;
export type StereoChunk=StereoPCM&{startFrame:number;frameCount:number};
export type StereoChunkSource={sampleRate:48000;channels:2;totalFrames:number;readChunk:(startFrame:number,signal?:AbortSignal)=>StereoChunk};
export function createStereoChunkSource(durationSeconds:number,clips:readonly StereoClip[],signal?:AbortSignal):StereoChunkSource|null{
 signal?.throwIfAborted();
 const totalFrames=frames(durationSeconds);
 if(!clips.length)return null;
 if(totalFrames>STEREO_MAX_FRAMES)throw new RangeError('Stereo duration exceeds ten-minute budget');
 if(totalFrames===0)return null;
 const snapshot=clips.map(clip=>({...clip}));
 return Object.freeze({sampleRate:48000 as const,channels:2 as const,totalFrames,
  readChunk(startFrame:number,requestSignal?:AbortSignal){
   signal?.throwIfAborted();requestSignal?.throwIfAborted();
   if(!Number.isSafeInteger(startFrame)||startFrame<0||startFrame>=totalFrames||startFrame%STEREO_CHUNK_FRAMES!==0)throw new RangeError('Invalid stereo chunk offset');
   const frameCount=Math.min(STEREO_CHUNK_FRAMES,totalFrames-startFrame);
   const pcm=mixStereoRange(totalFrames,snapshot,startFrame,frameCount,requestSignal??signal);
   signal?.throwIfAborted();
   return {...pcm,startFrame,frameCount};
  }
 });
}

export async function mixProjectStereoAudio(project:Project,decode:(id:string,signal?:AbortSignal)=>Promise<StereoSource>,signal?:AbortSignal):Promise<StereoPCM|null>{
 const prepared=await prepareProjectStereo(project,decode,Math.floor(MAX_BYTES/8),signal);
 return prepared?mixStereoAudio(prepared.duration,prepared.clips,signal):null;
}
export async function createProjectStereoChunkSource(project:Project,decode:(id:string,signal?:AbortSignal)=>Promise<StereoSource>,signal?:AbortSignal):Promise<StereoChunkSource|null>{
 const prepared=await prepareProjectStereo(project,decode,STEREO_MAX_FRAMES,signal);
 return prepared?createStereoChunkSource(prepared.duration,prepared.clips,signal):null;
}
export async function createBrowserStereoChunkSource(project:Project,signal?:AbortSignal):Promise<StereoChunkSource|null>{
 signal?.throwIfAborted();
 if(!audioWindows(project,0).length)return null;
 if(frames(projectFrames(project)/project.fps)>STEREO_MAX_FRAMES)throw new RangeError('Stereo duration exceeds ten-minute budget');
 const {audioBuffers}=await import('./audio-engine.ts');
 const buffers=await audioBuffers(project);
 signal?.throwIfAborted();
 return createProjectStereoChunkSource(project,async id=>{
  const buffer=buffers.get(id);
  if(!buffer)throw new Error('Audio media is not ready');
  return buffer;
 },signal);
}
