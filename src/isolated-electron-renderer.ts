/** RFDR production-integration candidate: real storyboard renderer-side IPC responder.
 * Explicitly opt-in; no production preload, main, or UI activation here.
 * Main process must authenticate the IPC sender and own project metadata.
 */
import type {Project} from './model.ts';
import {renderIsolatedProjectFrame} from './deterministic-artwork-renderer.ts';
import {mixProjectAudioInBrowser} from './deterministic-project-audio.ts';
import {projectFrames} from './model.ts';

export type IsolatedBrowserRequest={token:string;kind:'frame'|'audio';index?:number};
export type IsolatedBrowserReply={token:string;kind:'frame'|'audio';data:unknown};
export interface IsolatedBrowserChannel {
 onRequest:(callback:(request:IsolatedBrowserRequest)=>void)=>()=>void;
 reply:(message:IsolatedBrowserReply)=>void;
}
export function attachIsolatedStoryboardRenderer(channel:IsolatedBrowserChannel,getProject:()=>Project|null){
 let closed=false;
 const controllers=new Set<AbortController>();
 const unsubscribe=channel.onRequest(request=>{
  if(closed||!request||typeof request.token!=='string'||!/^[-a-zA-Z0-9]{1,120}$/.test(request.token)||
     (request.kind!=='frame'&&request.kind!=='audio'))return;
  const controller=new AbortController();controllers.add(controller);
  void (async()=>{
   try{
    const project=getProject();
    if(!project)throw new Error('No active storyboard project');
    const data=request.kind==='frame'
     ?await (async()=>{
       if(!Number.isSafeInteger(request.index)||request.index!<0||request.index!>=projectFrames(project))throw new RangeError('Invalid frame index');
       const frame=await renderIsolatedProjectFrame(project,request.index!,{signal:controller.signal,width:project.width});
       if(frame.width!==project.width||frame.height!==project.height)throw new Error('Unexpected rendered geometry');
       return {index:frame.index,timestampUs:frame.timestampUs,pixels:frame.pixels};
      })()
     :await mixProjectAudioInBrowser(project,controller.signal);
    if(!closed&&!controller.signal.aborted)channel.reply({token:request.token,kind:request.kind,data});
   }catch{
    // Invalid/missing data must fail the authenticated main-side timeout/validation gate.
    // Never send an untrusted error object or expose project details through IPC.
   }finally{controllers.delete(controller)}
  })();
 });
 return ()=>{if(closed)return;closed=true;unsubscribe();for(const controller of controllers)controller.abort();controllers.clear()};
}
