import {Muxer,ArrayBufferTarget} from 'webm-muxer';
// D4.6.5K isolated extended-duration fixture: 6 seconds, 144 frames,
// 300 audio input blocks, two dissolves, nonuniform panel durations.
export async function createExtendedWebM(stress=false){
 const fps=24,rate=48000,width=320,height=180,frames=144;
 const target=new ArrayBufferTarget();
 const muxer=new Muxer({target,video:{codec:'V_VP8',width,height,frameRate:fps},audio:{codec:'A_OPUS',numberOfChannels:1,sampleRate:rate},firstTimestampBehavior:'offset'});
 const errors=[],vt=[],at=[];
 const v=new VideoEncoder({output:(chunk,meta)=>{vt.push(chunk.timestamp);muxer.addVideoChunk(chunk,meta);},error:e=>errors.push(String(e))});
 const a=new AudioEncoder({output:(chunk,meta)=>{at.push(chunk.timestamp);muxer.addAudioChunk(chunk,meta);},error:e=>errors.push(String(e))});
 v.configure({codec:'vp8',width,height,bitrate:500000,framerate:fps});
 a.configure({codec:'opus',sampleRate:rate,numberOfChannels:1,bitrate:64000});
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
 for(let i=0;i<frames;i++){
  const t=i/fps;
  // Panels: red 0-1.5, blue 1.5-3.75, green 3.75-6.
  // Dissolve 1.25-1.5 and 3.5-3.75.
  let rgb;
  if(t<1.25)rgb=[255,0,0];
  else if(t<1.5){const q=(t-1.25)/0.25;rgb=[Math.round(255*(1-q)),0,Math.round(255*q)];}
  else if(t<3.5)rgb=[0,0,255];
  else if(t<3.75){const q=(t-3.5)/0.25;rgb=[0,Math.round(255*q),Math.round(255*(1-q))];}
  else rgb=[0,255,0];
  ctx.fillStyle='rgb('+rgb.join(',')+')';ctx.fillRect(0,0,width,height);
  if(stress&&i%12===0){const end=performance.now()+65;while(performance.now()<end){}}
  const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});
  v.encode(frame,{keyFrame:i===0||i===36||i===90});frame.close();
 }
 for(let i=0;i<300;i++){
  const data=new Float32Array(960);
  for(let j=0;j<960;j++){const n=i*960+j;data[j]=n<240000?0.2*Math.sin(2*Math.PI*440*n/rate):0;}
  const sample=new AudioData({format:'f32-planar',sampleRate:rate,numberOfFrames:960,numberOfChannels:1,timestamp:i*20000,data});
  a.encode(sample);sample.close();
 }
 await Promise.all([v.flush(),a.flush()]);v.close();a.close();muxer.finalize();
 return {bytes:Array.from(new Uint8Array(target.buffer)),report:{stress,frames:vt.length,audioPackets:at.length,videoMonotonic:vt.every((x,i)=>!i||x>vt[i-1]),audioMonotonic:at.every((x,i)=>!i||x>at[i-1]),errors}};
}
