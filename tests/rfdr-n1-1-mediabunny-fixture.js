// N1.1: Mediabunny feasibility, intentionally independent of production exporter.
// Tests whether maintained muxer emits exact Opus duration without EBML patches.
import {Output,WebMOutputFormat,BufferTarget,CanvasSource,AudioBufferSource,Quality} from 'mediabunny';
export async function createMediabunnyFixture({audio=false,stress=false,cancel=false}={}){
 const target=new BufferTarget(),output=new Output({format:new WebMOutputFormat(),target});
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
 const ctx=canvas.getContext('2d');
 const video=new CanvasSource(canvas,{codec:'vp8',quality:new Quality({bitrate:500000})});
 output.addVideoTrack(video,{frameRate:24});
 let sound;
 if(audio){sound=new AudioBufferSource({codec:'opus',quality:new Quality({bitrate:64000})});output.addAudioTrack(sound);}
 await output.start();
 if(cancel){await output.cancel();return {canceled:true,state:output.state};}
 for(let i=0;i<144;i++){
  const t=i/24,blend=Math.max(0,Math.min(1,(t-2.75)/0.25));
  ctx.fillStyle=`rgb(${Math.round(255*(1-blend))},0,${Math.round(255*blend)})`;
  ctx.fillRect(0,0,320,180);
  if(stress&&i%12===0){const until=performance.now()+65;while(performance.now()<until){}}
  await video.add(t,1/24,{keyFrame:i===0});
 }
 video.close();
 if(sound){
  const buffer=new AudioBuffer({length:288000,numberOfChannels:1,sampleRate:48000});
  const samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=i<144000?0.2*Math.sin(2*Math.PI*440*i/48000):0;
  await sound.add(buffer);sound.close();
 }
 await output.finalize();
 const bytes=new Uint8Array(target.buffer);
 return {bytes:Array.from(bytes),report:{audio,stress,state:output.state,framesSubmitted:144,expectedDuration:6,bytes:bytes.length}};
}
