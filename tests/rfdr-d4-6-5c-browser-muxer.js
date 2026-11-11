import {Muxer,ArrayBufferTarget} from 'webm-muxer';
export async function createWebM(stress=false){
 const fps=24,width=320,height=180,rate=48000;
 const target=new ArrayBufferTarget();
 const muxer=new Muxer({target,video:{codec:'V_VP8',width,height,frameRate:fps},audio:{codec:'A_OPUS',numberOfChannels:1,sampleRate:rate},firstTimestampBehavior:'offset'});
 const errors=[],videoTimes=[],audioTimes=[];
 const video=new VideoEncoder({output:(chunk,meta)=>{videoTimes.push(chunk.timestamp);muxer.addVideoChunk(chunk,meta);},error:e=>errors.push(String(e))});
 const audio=new AudioEncoder({output:(chunk,meta)=>{audioTimes.push(chunk.timestamp);muxer.addAudioChunk(chunk,meta);},error:e=>errors.push(String(e))});
 video.configure({codec:'vp8',width,height,bitrate:500000,framerate:fps});
 audio.configure({codec:'opus',sampleRate:rate,numberOfChannels:1,bitrate:64000});
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
 for(let i=0;i<72;i++){
  const blend=Math.max(0,Math.min(1,(i/24-0.75)/0.25));
  ctx.fillStyle='rgb('+Math.round(255*(1-blend))+',0,'+Math.round(255*blend)+')';ctx.fillRect(0,0,width,height);
  if(stress&&i%12===0){const end=performance.now()+65;while(performance.now()<end){}}
  const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});
  video.encode(frame,{keyFrame:i===0});frame.close();
 }
 for(let i=0;i<150;i++){
  const data=new Float32Array(960);
  for(let j=0;j<960;j++){const n=i*960+j;data[j]=n<72000?0.2*Math.sin(2*Math.PI*440*n/rate):0;}
  const sample=new AudioData({format:'f32-planar',sampleRate:rate,numberOfFrames:960,numberOfChannels:1,timestamp:i*20000,data});
  audio.encode(sample);sample.close();
 }
 await Promise.all([video.flush(),audio.flush()]);video.close();audio.close();
 muxer.finalize();
 return {bytes:Array.from(new Uint8Array(target.buffer)),report:{stress,videoChunks:videoTimes.length,audioChunks:audioTimes.length,firstVideoTimestamp:videoTimes[0],lastVideoTimestamp:videoTimes.at(-1),videoMonotonic:videoTimes.every((x,i)=>!i||x>videoTimes[i-1]),audioMonotonic:audioTimes.every((x,i)=>!i||x>audioTimes[i-1]),errors}};
}
