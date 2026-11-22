/**
 * N3.6 isolated, read-only artwork-frame feasibility seam.
 * Uses the accepted playback painter rather than a second drawing engine.
 * No production exporter imports this module. No encoding or audio decoding.
 */
import type {Project} from './model.ts';
import {preloadImages} from './render.ts';
import {paintPlayback} from './playback-render.ts';
import {inspectDeterministicProject} from './deterministic-project-adapter.ts';

export interface N36RenderedFrame {
  index:number;
  timestampUs:number;
  width:number;
  height:number;
  pixels:Uint8ClampedArray;
}
export async function renderIsolatedProjectFrame(
  project:Project,
  index:number,
  options:{width?:number;signal?:AbortSignal}={},
):Promise<N36RenderedFrame>{
  const {signal}=options;
  signal?.throwIfAborted();
  const width=options.width??Math.min(project.width,1920);
  if(!Number.isSafeInteger(width)||width<1||width>2400)throw new RangeError('Invalid isolated render width.');
  const schedule=inspectDeterministicProject(project,signal);
  if(!Number.isSafeInteger(index)||index<0||index>=schedule.totalFrames)throw new RangeError('Frame outside project timeline.');
  if(typeof document==='undefined')throw new Error('N3.6 requires a browser canvas environment.');
  const frame=schedule.frames[index];
  const from=project.scenes.flatMap(s=>s.panels).find(p=>p.id===frame.panelId);
  if(!from)throw new Error('Missing frame panel.');
  const to=frame.transition
    ?project.scenes.flatMap(s=>s.panels).find(p=>p.id===frame.transition!.toId)
    :undefined;
  // Prepare exactly the visible panel(s); a transition needs both.
  await Promise.all([from,...(to?[to]:[])].map(p=>preloadImages(p)));
  signal?.throwIfAborted();
  const canvas=document.createElement('canvas');
  paintPlayback(canvas,project,index,width,[]);
  signal?.throwIfAborted();
  const pixels=canvas.getContext('2d',{willReadFrequently:true})?.getImageData(0,0,canvas.width,canvas.height);
  if(!pixels)throw new Error('Canvas pixels unavailable.');
  signal?.throwIfAborted();
  return {index,timestampUs:frame.timestampUs,width:canvas.width,height:canvas.height,pixels:new Uint8ClampedArray(pixels.data)};
}
