/** N3.13 isolated project-to-coordinator bridge; sink injected, production exporter untouched. */
import type {Project} from './model.ts';
import {inspectDeterministicProject} from './deterministic-project-adapter.ts';
import {renderIsolatedProjectFrame} from './deterministic-artwork-renderer.ts';
import {mixProjectAudio, type DecodeMono} from './deterministic-project-audio.ts';
import {runIsolatedExport, type ExportSink, type ExportFrame} from './isolated-export-coordinator.ts';
export interface ProjectExportBridge {
 render?:(project:Project,index:number,signal:AbortSignal)=>Promise<{index:number;timestampUs:number;pixels:Uint8Array|Uint8ClampedArray}>;
 decode:DecodeMono;
 sink:ExportSink;
 signal:AbortSignal;
 onProgress?:(value:number)=>void;
}
export async function exportIsolatedProject(project:Project,options:ProjectExportBridge):Promise<Uint8Array>{
 const schedule=inspectDeterministicProject(project,options.signal);
 const render=options.render??((p:Project,i:number,s:AbortSignal)=>renderIsolatedProjectFrame(p,i,{signal:s}));
 return runIsolatedExport({
  frameCount:schedule.totalFrames,fps:schedule.fps,signal:options.signal,sink:options.sink,onProgress:options.onProgress,
  renderFrame:async(index,signal)=>{
   const frame=await render(project,index,signal);
   const expected=schedule.frames[index];
   if(frame.index!==index||frame.timestampUs!==expected.timestampUs)throw new Error('Project frame schedule mismatch');
   return {index,timestampUs:frame.timestampUs,pixels:new Uint8Array(frame.pixels)} satisfies ExportFrame;
  },
  renderAudio:async signal=>{
   const audio=await mixProjectAudio(project,options.decode,signal);
   return audio?{sampleRate:audio.sampleRate,samples:audio.samples}:null;
  }
 });
}
