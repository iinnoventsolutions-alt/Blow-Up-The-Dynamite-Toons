import { withWebmDuration } from './webm-duration';
import { audioBuffers,scheduleAudio } from './audio-engine';
import { allPanels,projectFrames,type Project } from './model';
import { preloadImages } from './render';
import { paintPlayback } from './playback-render';
export const webmType=()=>['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type=>typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported(type));
export async function exportAnimatic(project:Project,signal:AbortSignal,onProgress:(n:number)=>void):Promise<Blob>{
 const type=webmType();if(!type)throw new Error('WebM recording is unavailable in this browser. Use the desktop app or a supported Chromium browser.');
 const ctx=new AudioContext();let stop=()=>{},recorder:MediaRecorder|undefined,raf=0,stream:MediaStream|undefined;
 try{await ctx.resume();await Promise.all(allPanels(project).map(e=>preloadImages(e.panel)));const buffers=await audioBuffers(project);signal.throwIfAborted();
 const width=Math.max(1,Math.min(project.width,Math.floor(1920*project.width/Math.max(project.width,project.height)))),canvas=document.createElement('canvas'),pictures:HTMLCanvasElement[]=[];paintPlayback(canvas,project,0,width,pictures);const video=canvas.captureStream(0),videoTrack=video.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack,output=ctx.createMediaStreamDestination();const hasAudio=project.audioTracks.some(track=>!track.mute&&(!project.audioTracks.some(t=>t.solo)||track.solo)&&track.clips.length>0);stream=new MediaStream([...video.getVideoTracks(),...(hasAudio?output.stream.getAudioTracks():[])]);
 recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:5000000,audioBitsPerSecond:192000});const recording=recorder,chunks:Blob[]=[];
 const blob=await new Promise<Blob>((resolve,reject)=>{let failure:Error|undefined;const abort=()=>{failure ||= new Error('Animatic export cancelled.');cancelAnimationFrame(raf);if(recording.state!=='inactive')recording.stop();else reject(failure);};const visibility=()=>{if(document.hidden){failure=new Error('Export stopped because the application became hidden. Keep it visible while exporting.');abort();}};recording.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recording.onerror=()=>{failure=new Error('Video recording failed.');if(recording.state!=='inactive')recording.stop();else reject(failure);};recording.onstop=()=>{signal.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',visibility);if(failure)reject(failure);else if(!chunks.length)reject(new Error('No video data was recorded.'));else resolve(new Blob(chunks,{type:'video/webm'}));};signal.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',visibility);
  // Do not gate rendering on MediaRecorder.onstart: Electron may defer that
  // event until the first canvas frame is submitted.
  const begin=()=>{const anchor=ctx.currentTime+.05,total=projectFrames(project),duration=total/project.fps;stop=scheduleAudio(project,ctx,output,0,anchor,buffers);// Preserve every storyboard frame in sequence. A delayed callback must not
  // jump directly to a later frame (which can erase a short dissolve).
  // At most one frame is submitted per animation callback so the capture track
  // has a rendering opportunity between submissions.
  let nextFrame=0;
  const tick=()=>{
   try{
    if(signal.aborted){abort();return;}
    const elapsed=Math.max(0,ctx.currentTime-anchor);
    if(nextFrame<total && elapsed>=nextFrame/project.fps){
     paintPlayback(canvas,project,nextFrame,width,pictures);
     videoTrack.requestFrame();
     nextFrame++;
    }
    onProgress(Math.min(1,Math.min(elapsed/duration,nextFrame/total)));
    if(nextFrame>=total && elapsed>=duration){
     stop();
     setTimeout(()=>{if(recording.state==='recording'){recording.requestData();recording.stop();}},200);
    }else raf=requestAnimationFrame(tick);
   }catch(e){failure=e as Error;abort();}
  };
  raf=requestAnimationFrame(tick);};
  recording.start(1000);
  begin();
 });return await withWebmDuration(blob,projectFrames(project)/project.fps);
 }finally{cancelAnimationFrame(raf);stop();if(recorder&&recorder.state!=='inactive')recorder.stop();stream?.getTracks().forEach(t=>t.stop());await ctx.close();}
}
