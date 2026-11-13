/** N3.17-K isolated browser-side project frame/audio provider.
 * This is a browser execution boundary, NOT an Electron IPC transport.
 * No production exporter or preload wiring.
 */
import type {Project} from './model.ts';
import {inspectDeterministicProject} from './deterministic-project-adapter.ts';
import {renderIsolatedProjectFrame} from './deterministic-artwork-renderer.ts';
import {mixProjectAudioInBrowser} from './deterministic-project-audio.ts';

export type BrowserFrame = {index:number;timestampUs:number;pixels:Uint8Array};
export type BrowserAudio = {sampleRate:48000;samples:Float32Array}|null;
export interface BrowserProjectProvider {
 metadata:Readonly<{id:string;width:number;height:number;fps:number;frameCount:number}>;
 renderFrame(index:number,signal:AbortSignal):Promise<BrowserFrame>;
 renderAudio(signal:AbortSignal):Promise<BrowserAudio>;
}
export function createBrowserProjectProvider(
 project:Project,
 dependencies:{
  render?:(project:Project,index:number,options:{width:number;signal:AbortSignal})=>Promise<{index:number;timestampUs:number;width:number;height:number;pixels:Uint8Array|Uint8ClampedArray}>;
  audio?:(project:Project,signal:AbortSignal)=>Promise<BrowserAudio>;
 }={},
):BrowserProjectProvider{
 const schedule=inspectDeterministicProject(project);
 const width=project.width,height=project.height,fps=project.fps;
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<2||height<2||width>2400||height>2400||width*height*4>64*1024*1024)
  throw new RangeError('Unsupported browser export dimensions');
 if(typeof project.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(project.id))
  throw new TypeError('Invalid project identifier');
 if(schedule.totalFrames<1||schedule.totalFrames>100000)throw new RangeError('Invalid frame count');
 const metadata=Object.freeze({id:project.id,width,height,fps,frameCount:schedule.totalFrames});
 const render=dependencies.render??renderIsolatedProjectFrame;
 const audio=dependencies.audio??mixProjectAudioInBrowser;
 return Object.freeze({
  metadata,
  async renderFrame(index:number,signal:AbortSignal){
   signal.throwIfAborted();
   if(!Number.isSafeInteger(index)||index<0||index>=schedule.totalFrames)throw new RangeError('Frame index out of bounds');
   const frame=await render(project,index,{width,signal});
   signal.throwIfAborted();
   const expected=schedule.frames[index];
   if(frame.index!==index||frame.timestampUs!==expected.timestampUs||frame.width!==width||frame.height!==height||
      !(frame.pixels instanceof Uint8Array)||frame.pixels.byteLength!==width*height*4)
    throw new Error('Browser frame geometry or timing mismatch');
   return {index,timestampUs:frame.timestampUs,pixels:new Uint8Array(frame.pixels)};
  },
  async renderAudio(signal:AbortSignal){
   signal.throwIfAborted();
   const result=await audio(project,signal);
   signal.throwIfAborted();
   if(result!==null&&(result.sampleRate!==48000||!(result.samples instanceof Float32Array)||result.samples.byteLength>128*1024*1024))
    throw new RangeError('Invalid browser audio buffer');
   return result===null?null:{sampleRate:48000 as const,samples:new Float32Array(result.samples)};
  }
 });
}
