import {Muxer,ArrayBufferTarget} from 'webm-muxer';
// D4.6.5L: video-only export must not create a synthetic audio track.
export async function createSilentWebM(stress=false){
 const fps=24,width=320,height=180,frames=144,target=new ArrayBufferTarget();
 const muxer=new Muxer({target,video:{codec:'V_VP8',width,height,frameRate:fps},firstTimestampBehavior:'offset'});
 const times=[],errors=[];
 const encoder=new VideoEncoder({output:(chunk,meta)=>{times.push(chunk.timestamp);muxer.addVideoChunk(chunk,meta);},error:e=>errors.push(String(e))});
 encoder.configure({codec:'vp8',width,height,bitrate:500000,framerate:fps});
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');
 for(let i=0;i<frames;i++){
  const t=i/fps,blend=Math.max(0,Math.min(1,(t-2.75)/0.25));
  ctx.fillStyle='rgb('+Math.round(255*(1-blend))+',0,'+Math.round(255*blend)+')';ctx.fillRect(0,0,width,height);
  if(stress&&i%12===0){const end=performance.now()+65;while(performance.now()<end){}}
  const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});
  encoder.encode(frame,{keyFrame:i===0||i===72});frame.close();
 }
 await encoder.flush();encoder.close();muxer.finalize();
 return {bytes:Array.from(new Uint8Array(target.buffer)),report:{stress,frames:times.length,monotonic:times.every((x,i)=>!i||x>times[i-1]),errors}};
}
