/** Isolated streaming FFmpeg sink: bounded in-flight video frames, temporary audio only. */
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {packagedEncoder}=require('./isolated-ffmpeg.cjs');
async function createIsolatedFfmpegSink({resourcesPath,width,height,fps,signal,spawnProcess=spawn,maxRawBytes=512*1024*1024,encodeTimeoutMs=120000}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<2||height<2||width*height*4>64*1024*1024)throw new RangeError('Invalid frame dimensions');
 if(!Number.isFinite(fps)||fps<=0||fps>240)throw new RangeError('Invalid fps');
 if(!Number.isSafeInteger(maxRawBytes)||maxRawBytes<1||maxRawBytes>2*1024*1024*1024)throw new RangeError('Invalid raw disk budget');
 if(!Number.isSafeInteger(encodeTimeoutMs)||encodeTimeoutMs<1||encodeTimeoutMs>600000)throw new RangeError('Invalid encode timeout');
 signal?.throwIfAborted();
 const binary=packagedEncoder(resourcesPath);
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rfdr-n315-'));
 const audioFile=path.join(dir,'audio.f32'),output=path.join(dir,'export.webm');
 let closed=false,count=0,hasAudio=false,child,completion,stopTimer,removeAbort=()=>{},failure=null;
 function ensure(s){if(closed)throw Error('Sink disposed');signal?.throwIfAborted();s?.throwIfAborted();if(failure)throw failure}
 function launch(s){
  const args=['-hide_banner','-loglevel','error','-nostdin','-y','-f','rawvideo','-pixel_format','rgba','-video_size',width+'x'+height,'-framerate',String(fps),'-i','pipe:0'];
  if(hasAudio)args.push('-f','f32le','-ar','48000','-ac','1','-i',audioFile);
  args.push('-map','0:v:0',...(hasAudio?['-map','1:a:0']:[]),'-c:v','libvpx','-pix_fmt','yuv420p','-auto-alt-ref','0','-b:v','1M',...(hasAudio?['-c:a','libopus']:['-an']),'-f','webm',output);
  child=spawnProcess(binary,args,{shell:false,stdio:['pipe','ignore','pipe'],windowsHide:true});
  // A cancelled/killed FFmpeg process can emit EPIPE after a write callback settles.
  // Keep a lifetime listener so late pipe errors never escape to Electron's main process.
  child.stdin.on('error',error=>{if(!signal?.aborted&&!s?.aborted&&!closed&&!failure)failure=error});
  let stderr='';
  child.stderr?.on('data',b=>{stderr=(stderr+b.toString()).slice(-4096)});
  completion=new Promise((resolve,reject)=>{
   let done=false;
   const finish=(err)=>{if(done)return;done=true;clearTimeout(stopTimer);removeAbort();if(err){failure=err;reject(err)}else resolve()};
   const abort=()=>{child.kill('SIGKILL');finish(new Error('FFmpeg export aborted'))};
   signal?.addEventListener('abort',abort,{once:true});s?.addEventListener('abort',abort,{once:true});
   removeAbort=()=>{signal?.removeEventListener('abort',abort);s?.removeEventListener('abort',abort)};
   stopTimer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('FFmpeg export timed out'))},encodeTimeoutMs);
   child.on('error',finish);
   child.on('close',code=>finish(code===0?null:new Error('FFmpeg export failed: '+stderr)));
   if(signal?.aborted||s?.aborted)abort();
  });
  // The process may fail before finish(); keep the rejection handled until awaited.
  completion.catch(()=>{});
 }
 return {
  async writeAudio(audio,s){
   ensure(s);if(child||count)throw Error('Audio must precede streamed frames');
   if(audio===null)return;
   if(audio.sampleRate!==48000||!(audio.samples instanceof Float32Array)||audio.samples.byteLength>128*1024*1024||audio.samples.byteLength>maxRawBytes)throw Error('Invalid audio format');
   await fs.writeFile(audioFile,Buffer.from(audio.samples.buffer,audio.samples.byteOffset,audio.samples.byteLength),{flag:'wx'});hasAudio=true;
  },
  async writeFrame(frame,s){
   ensure(s);
   if(frame.index!==count||frame.pixels.byteLength!==width*height*4)throw Error('Invalid frame order or RGBA size');
   // Streamed video is piped with backpressure, not stored on disk.\n   // Bound a single in-flight frame; do not cap cumulative streamed bytes.\n   if(frame.pixels.byteLength>maxRawBytes)throw new RangeError('Raw video frame budget exceeded');
   if(!child)launch(s);
   ensure(s);
   const bytes=Buffer.from(frame.pixels.buffer,frame.pixels.byteOffset,frame.pixels.byteLength);
   // The write callback provides backpressure, preventing unbounded queued frames.
   await new Promise((resolve,reject)=>{
    const onError=e=>{child.stdin.removeListener('error',onError);reject(e)};
    child.stdin.once('error',onError);
    child.stdin.write(bytes,e=>{child.stdin.removeListener('error',onError);e?reject(e):resolve()});
   });
   ensure(s);count++;
  },
  async finish(s){
   ensure(s);if(count<1)throw Error('No video frames');
   child.stdin.end();
   await completion;ensure(s);
   const stat=await fs.stat(output);if(stat.size>512*1024*1024)throw new RangeError('Encoded output budget exceeded');
   return new Uint8Array(await fs.readFile(output));
  },
  async dispose(){
   if(closed)return;closed=true;
   if(child&&child.exitCode===null)child.kill('SIGKILL');
   clearTimeout(stopTimer);removeAbort();
   await fs.rm(dir,{recursive:true,force:true});
  }
 };
}
module.exports={createIsolatedFfmpegSink};
