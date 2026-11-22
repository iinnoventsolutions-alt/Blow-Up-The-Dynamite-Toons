/** N3.15 isolated packaged-encoder boundary; no IPC registration or production wiring. */
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
function packagedEncoder(resourcesPath,platform=process.platform){
 if(platform!=='darwin')throw new Error('Packaged encoder prototype currently supports macOS only');
 if(typeof resourcesPath!=='string'||!path.isAbsolute(resourcesPath))throw new TypeError('Invalid Electron resources path');
 // Relocated CI runtime keeps its dylibs next to ../bin, resolved via @executable_path/../lib.
 const runtimeRoot=path.join(resourcesPath,'ffmpeg-runtime');
 const candidate=path.join(runtimeRoot,'bin','ffmpeg');
 const realResources=fs.realpathSync(resourcesPath);
 const realRuntime=fs.realpathSync(runtimeRoot);
 const realBin=fs.realpathSync(path.join(runtimeRoot,'bin'));
 const realLib=fs.realpathSync(path.join(runtimeRoot,'lib'));
 const realBinary=fs.realpathSync(candidate);
 if(path.dirname(realRuntime)!==realResources||path.dirname(realBin)!==realRuntime||path.dirname(realLib)!==realRuntime||path.dirname(realBinary)!==realBin)
  throw new Error('Packaged FFmpeg must remain within the bundled runtime; external symlinks are forbidden');
 for(const name of ['libvpx.12.dylib','libopus.0.dylib']){
  const library=fs.realpathSync(path.join(runtimeRoot,'lib',name));
  if(path.dirname(library)!==realLib||!fs.statSync(library).isFile())throw new Error('Packaged FFmpeg dependency must remain within bundled lib directory');
 }
 const st=fs.statSync(realBinary);
 if(!st.isFile()||(st.mode&0o111)===0)throw new Error('Packaged FFmpeg is not executable');
 return realBinary;
}
async function probePackagedEncoder(resourcesPath,{signal,timeoutMs=10000,spawnProcess=spawn}={}){
 signal?.throwIfAborted();
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw new RangeError('Invalid encoder probe timeout');
 const binary=packagedEncoder(resourcesPath);
 return new Promise((resolve,reject)=>{
  let settled=false,output='',errorOutput='';
  const child=spawnProcess(binary,['-hide_banner','-version'],{shell:false,stdio:['ignore','pipe','pipe'],signal,windowsHide:true});
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('Packaged FFmpeg probe timed out'));},timeoutMs);
  const finish=(err,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(err)reject(err);else resolve(value)};
  child.stdout?.on('data',chunk=>{output+=chunk.toString();if(output.length>32768){child.kill('SIGKILL');finish(new Error('Encoder probe output exceeded limit'))}});
  child.stderr?.on('data',chunk=>{errorOutput+=chunk.toString();if(errorOutput.length>32768){child.kill('SIGKILL');finish(new Error('Encoder probe diagnostic exceeded limit'))}});
  child.on('error',e=>finish(e));
  child.on('close',code=>code===0&&/^ffmpeg version /m.test(output)?finish(null,{binary,version:output.split('\\n')[0]}):finish(new Error('Packaged FFmpeg version probe failed')));
 });
}
module.exports={packagedEncoder,probePackagedEncoder};
