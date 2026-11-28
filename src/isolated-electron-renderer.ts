/** RFDR production-integration candidate: real storyboard renderer-side IPC responder.
 * Explicitly opt-in; no production preload, main, or UI activation here.
 * Main process must authenticate the IPC sender and own project metadata.
 */
import type {Project} from './model.ts';
import {projectFrames} from './model.ts';

import type {StereoChunkSource} from './deterministic-stereo-audio.ts';
export type IsolatedBrowserRequest={token:string;kind:'frame'|'audio'|'stereo-begin'|'stereo-chunk'|'stereo-cancel';sessionId?:string;geometry?:{width:number;height:number};index?:number;totalFrames?:number;startFrame?:number};
export type IsolatedBrowserReply={token:string;kind:'frame'|'audio'|'stereo-begin'|'stereo-chunk'|'stereo-cancel';sessionId?:string;data:unknown;error?:string};
export interface IsolatedBrowserChannel {
 onRequest:(callback:(request:IsolatedBrowserRequest)=>void)=>()=>void;
 reply:(message:IsolatedBrowserReply)=>void;
}
export function attachIsolatedStoryboardRenderer(channel:IsolatedBrowserChannel,getProject:()=>Project|null,enableStereo=false){
 let closed=false;
 let stereo:StereoChunkSource|null=null,stereoProject:Project|null=null,next=0,stereoBusy=false;
 let stereoSession:string|undefined,stereoController:AbortController|undefined;
 const controllers=new Set<AbortController>();
 const unsubscribe=channel.onRequest(request=>{
  if(enableStereo===true&&!closed&&request?.kind==='stereo-cancel'){
   if(typeof request.sessionId==='string'&&request.sessionId===stereoSession){
    stereoController?.abort();stereo=null;stereoProject=null;stereoSession=undefined;
   }
   return;
  }
  if(closed||!request||typeof request.token!=='string'||!/^[-a-zA-Z0-9]{1,120}$/.test(request.token)||
     (request.kind!=='frame'&&request.kind!=='audio'&&!(enableStereo===true&&(request.kind==='stereo-begin'||request.kind==='stereo-chunk'))))return;
  const isStereo=request.kind==='stereo-begin'||request.kind==='stereo-chunk';
  if(isStereo&&request.sessionId!==undefined&&(typeof request.sessionId!=='string'||!/^[-a-zA-Z0-9]{1,120}$/.test(request.sessionId)))return;
  if(isStereo&&stereoBusy){channel.reply({token:request.token,kind:request.kind,sessionId:request.sessionId,data:null,error:'Export renderer busy'});return;}
  if(isStereo)stereoBusy=true;
  const controller=new AbortController();controllers.add(controller);
  if(isStereo)stereoController=controller;
  void (async()=>{
   try{
    const project=getProject();
    if(!project)throw new Error('No active storyboard project');
    const data=request.kind==='stereo-begin'
     ?await (async()=>{
       stereo=null;stereoProject=null;next=0;stereoSession=request.sessionId;
       const expected=Math.round(projectFrames(project)/project.fps*48000);
       if(request.totalFrames!==expected||expected<1||expected>28800000)throw new RangeError('Invalid stereo duration');
       const {createBrowserStereoChunkSource}=await import('./deterministic-stereo-audio.ts');
       const source=await createBrowserStereoChunkSource(project,controller.signal);
       controller.signal.throwIfAborted();stereo=source;
       if(!stereo)return null;
       stereoProject=project;
       return {sampleRate:48000,channels:2,totalFrames:stereo.totalFrames};
      })()
     :request.kind==='stereo-chunk'
     ?(()=>{
       if(request.sessionId!==stereoSession||!stereo||stereoProject!==project||request.startFrame!==next)throw new Error('Invalid stereo sequence');
       const chunk=stereo.readChunk(next,controller.signal);next+=chunk.frameCount;
       if(next===stereo.totalFrames){stereo=null;stereoProject=null;}
       return chunk;
      })()
     :request.kind==='frame'
     ?await (async()=>{
       if(!Number.isSafeInteger(request.index)||request.index!<0||request.index!>=projectFrames(project))throw new RangeError('Invalid frame index');
       const {renderIsolatedProjectFrame}=await import('./deterministic-artwork-renderer.ts');
       const geometry=request.geometry;
       if(geometry){
        const scale=Math.min(1,1920/Math.max(project.width,project.height));
        if(!enableStereo||geometry.width!==Math.floor(project.width*scale/2)*2||geometry.height!==Math.floor(project.height*scale/2)*2||geometry.width<2||geometry.height<2)throw new Error('Invalid export geometry');
       }
       const frame=await renderIsolatedProjectFrame(project,request.index!,{signal:controller.signal,width:geometry?.width??project.width,height:geometry?.height});
       if(frame.width!==(geometry?.width??project.width)||frame.height!==(geometry?.height??project.height))throw new Error('Unexpected rendered geometry');
       return {index:frame.index,timestampUs:frame.timestampUs,pixels:frame.pixels};
      })()
     :await (async()=>{const {mixProjectAudioInBrowser}=await import('./deterministic-project-audio.ts');return mixProjectAudioInBrowser(project,controller.signal)})();
    if(!closed&&!controller.signal.aborted)channel.reply({token:request.token,kind:request.kind,sessionId:request.sessionId,data});
   }catch{
    if(isStereo){stereo=null;stereoProject=null;}
    // Fail promptly through the existing authenticated main-side error channel.
    // Do not expose internal exception details or project data.
    if(!closed&&!controller.signal.aborted)channel.reply({token:request.token,kind:request.kind,sessionId:request.sessionId,data:null,error:'Export renderer failed'});
   }finally{controllers.delete(controller);if(isStereo){stereoBusy=false;stereoController=undefined}}
  })();
 });
 return ()=>{if(closed)return;closed=true;stereo=null;stereoProject=null;unsubscribe();for(const controller of controllers)controller.abort();controllers.clear()};
}
