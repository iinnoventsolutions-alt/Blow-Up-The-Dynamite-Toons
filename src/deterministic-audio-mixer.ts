/**
 * N3.3 isolated offline mono PCM mixer for deterministic fixtures.
 * Source buffers are already decoded at the target sample rate.
 * Not connected to the production audio engine or exporter.
 */
export interface N33Clip {
  startSeconds: number;
  trimStartSeconds: number;
  durationSeconds: number;
  sourceSamples: Float32Array;
  gain?: number;
}
export interface N33AudioInput {
  durationSeconds: number;
  sampleRate?: number;
  clips: readonly N33Clip[];
  signal?: AbortSignal;
}
export interface N33Audio {
  sampleRate: number;
  samples: Float32Array;
  durationSeconds: number;
}
function sampleIndex(seconds:number,rate:number):number {
  if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('time must be finite and nonnegative');
  const result=Math.round(seconds*rate);
  if(!Number.isSafeInteger(result))throw new RangeError('sample index exceeds safe range');
  return result;
}
export function mixDeterministicAudio(input:N33AudioInput):N33Audio|null {
  input.signal?.throwIfAborted();
  const rate=input.sampleRate??48000;
  if(!Number.isSafeInteger(rate)||rate<=0)throw new RangeError('invalid sample rate');
  const total=sampleIndex(input.durationSeconds,rate);
  if(total>28_800_000)throw new RangeError('offline audio exceeds ten-minute sample budget at 48kHz');
  if(input.clips.length===0)return null;
  const samples=new Float32Array(total);
  for(const clip of input.clips){
    input.signal?.throwIfAborted();
    if(!(clip.sourceSamples instanceof Float32Array))throw new TypeError('sourceSamples must be decoded mono Float32Array');
    const start=sampleIndex(clip.startSeconds,rate);
    const trim=sampleIndex(clip.trimStartSeconds,rate);
    const duration=sampleIndex(clip.durationSeconds,rate);
    const gain=clip.gain??1;
    if(!Number.isFinite(gain)||gain<0)throw new RangeError('invalid gain');
    if(trim+duration>clip.sourceSamples.length)throw new RangeError('trim exceeds source audio');
    const count=Math.min(duration,Math.max(0,total-start));
    for(let i=0;i<count;i++){
      if((i&4095)===0)input.signal?.throwIfAborted();
      samples[start+i]+=clip.sourceSamples[trim+i]*gain;
    }
  }
  input.signal?.throwIfAborted();
  return {sampleRate:rate,samples,durationSeconds:total/rate};
}
