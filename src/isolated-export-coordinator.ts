/** N3.11 isolated export orchestration contract. No production exporter wiring. */
export interface ExportFrame { index:number; timestampUs:number; pixels:Uint8Array }
export interface ExportAudio { sampleRate:number; samples:Float32Array }
export interface ExportSink {
 writeFrame(frame:ExportFrame,signal:AbortSignal):Promise<void>;
 writeAudio(audio:ExportAudio|null,signal:AbortSignal):Promise<void>;
 finish(signal:AbortSignal):Promise<Uint8Array>;
 dispose():Promise<void>;
}
export interface ExportInput {
 frameCount:number;
 fps:number;
 renderFrame:(index:number,signal:AbortSignal)=>Promise<ExportFrame>;
 renderAudio:(signal:AbortSignal)=>Promise<ExportAudio|null>;
 sink:ExportSink;
 signal:AbortSignal;
 onProgress?:(progress:number)=>void;
}
export async function runIsolatedExport(input:ExportInput):Promise<Uint8Array>{
 const {frameCount,fps,renderFrame,renderAudio,sink,signal,onProgress}=input;
 if(!Number.isSafeInteger(frameCount)||frameCount<1||frameCount>1_000_000)throw new RangeError('Invalid frame count');
 if(!Number.isFinite(fps)||fps<=0||fps>240)throw new RangeError('Invalid frame rate');
 try{
  signal.throwIfAborted();
  onProgress?.(0);
  for(let i=0;i<frameCount;i++){
   signal.throwIfAborted();
   const frame=await renderFrame(i,signal);
   signal.throwIfAborted();
   if(frame.index!==i||frame.timestampUs!==Math.round(i*1_000_000/fps))throw new Error('Frame index/timestamp mismatch');
   if(!(frame.pixels instanceof Uint8Array)||frame.pixels.byteLength===0||frame.pixels.byteLength>64*1024*1024)throw new RangeError('Frame pixel budget exceeded or invalid');
   await sink.writeFrame(frame,signal); // awaited: at most one in-flight frame
   signal.throwIfAborted();
   onProgress?.((i+1)/(frameCount+1));
  }
  const audio=await renderAudio(signal);
  signal.throwIfAborted();
  if(audio!==null&&(!Number.isSafeInteger(audio.sampleRate)||audio.sampleRate<=0||!(audio.samples instanceof Float32Array)||audio.samples.byteLength>128*1024*1024))throw new RangeError('Audio PCM budget exceeded or invalid');
  await sink.writeAudio(audio,signal); // null means intentionally silent export
  signal.throwIfAborted();
  onProgress?.(frameCount/(frameCount+1)+1/(2*(frameCount+1)));
  const output=await sink.finish(signal);
  signal.throwIfAborted();
  if(!(output instanceof Uint8Array)||output.byteLength>512*1024*1024)throw new RangeError('Encoded output budget exceeded or invalid');
  onProgress?.(1);
  return output;
 }finally{
  await sink.dispose(); // success, failure and cancellation
 }
}
