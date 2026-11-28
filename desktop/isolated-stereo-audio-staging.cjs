/** Isolated stereo staging; caller owns disposal after encoding. */
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
async function stageStereoAudio({transport,totalFrames,signal,maxRawBytes=512*1024*1024}={}){
 if(!transport||typeof transport.begin!=='function'||typeof transport.read!=='function'||typeof transport.close!=='function')throw new TypeError('Stereo transport required');
 if(!Number.isSafeInteger(totalFrames)||totalFrames<1||totalFrames>28800000||!Number.isSafeInteger(maxRawBytes)||maxRawBytes<1||totalFrames*8>maxRawBytes)throw new RangeError('Stereo disk budget exceeded');
 let dir,handle;
 try{
  signal?.throwIfAborted();
  const metadata=await transport.begin(totalFrames,signal);
  signal?.throwIfAborted();
  if(metadata===null)return null;
  if(!metadata||metadata.sampleRate!==48000||metadata.channels!==2||metadata.totalFrames!==totalFrames)throw new Error('Invalid stereo metadata');
  dir=await fs.mkdtemp(path.join(os.tmpdir(),'rfdr-stereo-'));
  const audioFile=path.join(dir,'audio.f32');
  handle=await fs.open(audioFile,'wx',0o600);
  for(let startFrame=0;startFrame<totalFrames;){
   signal?.throwIfAborted();
   const chunk=await transport.read(startFrame,signal);
   signal?.throwIfAborted();
   const count=Math.min(48000,totalFrames-startFrame);
   if(!chunk||chunk.sampleRate!==48000||chunk.channels!==2||chunk.startFrame!==startFrame||chunk.frameCount!==count||!(chunk.samples instanceof Float32Array)||chunk.samples.length!==count*2)throw new Error('Invalid stereo staging chunk');
   const bytes=Buffer.alloc(count*8);
   for(let i=0;i<chunk.samples.length;i++){
    const sample=chunk.samples[i];
    if(!Number.isFinite(sample))throw new Error('Invalid stereo sample');
    bytes.writeFloatLE(sample,i*4);
   }
   let written=0;
   while(written<bytes.length){
    signal?.throwIfAborted();
    const result=await handle.write(bytes,written,bytes.length-written,startFrame*8+written);
    if(result.bytesWritten<1)throw new Error('Incomplete stereo write');
    written+=result.bytesWritten;
   }
   startFrame+=count;
  }
  signal?.throwIfAborted();
  if((await handle.stat()).size!==totalFrames*8)throw new Error('Incomplete stereo file');
  await handle.close();handle=null;
  signal?.throwIfAborted();
  const ownedDir=dir;
  return Object.freeze({audioFile,sampleRate:48000,channels:2,totalFrames,async dispose(){await fs.rm(ownedDir,{recursive:true,force:true})}});
 }catch(error){
  try{await handle?.close()}finally{if(dir)await fs.rm(dir,{recursive:true,force:true})}
  throw error;
 }finally{transport.close()}
}
module.exports={stageStereoAudio};
