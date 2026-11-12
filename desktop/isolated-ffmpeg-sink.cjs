/** N3.15-B isolated disk-backed FFmpeg sink. Not registered with Electron IPC or production exporter. */
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
 const frames=path.join(dir,'frames.rgba'),audioFile=path.join(dir,'audio.f32'),output=path.join(dir,'export.webm');
 let handle,closed=false,count=0,hasAudio=false,activeChild,rawBytes=0;
 try{handle=await fs.open(frames,'wx');}
 catch(e){await fs.rm(dir,{recursive:true,force:true});throw e}
 function ensure(signalArg){if(closed)throw Error('Sink disposed');signal?.throwIfAborted();signalArg?.throwIfAborted()}
 return {
  async writeFrame(frame,s){ensure(s);if(frame.index!==count||frame.pixels.byteLength!==width*height*4)throw Error('Invalid frame order or RGBA size');if(rawBytes+frame.pixels.byteLength>maxRawBytes)throw new RangeError('Raw frame disk budget exceeded');await handle.writeFile(frame.pixels);rawBytes+=frame.pixels.byteLength;count++},
  async writeAudio(audio,s){ensure(s);if(audio===null)return;if(audio.sampleRate!==48000||!(audio.samples instanceof Float32Array)||audio.samples.byteLength>128*1024*1024)throw Error('Invalid audio format');if(rawBytes+audio.samples.byteLength>maxRawBytes)throw new RangeError('Raw audio disk budget exceeded');await fs.writeFile(audioFile,Buffer.from(audio.samples.buffer,audio.samples.byteOffset,audio.samples.byteLength),{flag:'wx'});rawBytes+=audio.samples.byteLength;hasAudio=true},
  async finish(s){
   ensure(s);if(count<1)throw Error('No video frames');
   await handle.close();handle=null;
   const args=['-hide_banner','-loglevel','error','-nostdin','-y','-f','rawvideo','-pixel_format','rgba','-video_size',width+'x'+height,'-framerate',String(fps),'-i',frames];
   if(hasAudio)args.push('-f','f32le','-ar','48000','-ac','1','-i',audioFile);
   args.push('-map','0:v:0',...(hasAudio?['-map','1:a:0']:[]),'-c:v','libvpx','-pix_fmt','yuv420p','-auto-alt-ref','0','-b:v','1M',...(hasAudio?['-c:a','libopus']:['-an']),'-f','webm',output);
   await new Promise((resolve,reject)=>{
    let done=false,stderr='';let child,timer;
    const finish=(err)=>{if(done)return;done=true;clearTimeout(timer);s?.removeEventListener('abort',abort);signal?.removeEventListener('abort',abort);if(err)reject(err);else resolve()};
    const abort=()=>{child?.kill('SIGKILL');finish(new Error('FFmpeg export aborted'))};
    try{child=spawnProcess(binary,args,{shell:false,stdio:['ignore','ignore','pipe'],windowsHide:true});activeChild=child}
    catch(e){finish(e);return}
    s?.addEventListener('abort',abort,{once:true});signal?.addEventListener('abort',abort,{once:true});
    timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('FFmpeg export timed out'))},encodeTimeoutMs);
    child.stderr?.on('data',b=>{stderr=(stderr+b.toString()).slice(-4096)});
    child.on('error',finish);
    child.on('close',code=>{activeChild=null;finish(code===0?null:new Error('FFmpeg export failed: '+stderr))});
    if(s?.aborted||signal?.aborted)abort();
   });
   const stat=await fs.stat(output);if(stat.size>512*1024*1024)throw new RangeError('Encoded output budget exceeded');
   return new Uint8Array(await fs.readFile(output));
  },
  async dispose(){if(closed)return;closed=true;activeChild?.kill('SIGKILL');try{await handle?.close()}finally{await fs.rm(dir,{recursive:true,force:true})}}
 };
}
module.exports={createIsolatedFfmpegSink};
