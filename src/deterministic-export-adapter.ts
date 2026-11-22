/**
 * N3.4 fixture-only integration of N3.1/N3.2 frame metadata and N3.3 PCM.
 * Does not render pixels, decode media, encode WebM, or access Project.
 */
import { resolveDeterministicFrameMetadata, type N32Fixture } from './deterministic-frame-metadata.ts';
import { mixDeterministicAudio, type N33Audio } from './deterministic-audio-mixer.ts';

export interface N34AudioClip {
  startSeconds: number;
  trimStartSeconds: number;
  durationSeconds: number;
  sourceSamples?: Float32Array;
  gain?: number;
}
export interface N34Fixture extends N32Fixture {
  width?: number;
  height?: number;
  audio?: readonly N34AudioClip[];
  simulatedRenderDelayMs?: number;
}
export async function renderDeterministicAnimatic(input: N34Fixture): Promise<{
  frames: ReturnType<typeof resolveDeterministicFrameMetadata>['frames'];
  durationSeconds: number;
  audio: N33Audio | null;
}> {
  input.signal?.throwIfAborted();
  const metadata = resolveDeterministicFrameMetadata(input);
  const rate = 48000;
  // Legacy N2 fixtures omit media. Fill their source windows with silence;
  // explicit PCM buffers are required to test actual audio mixing.
  const clips = (input.audio??[]).map(clip => {
    const sourceLength=Math.round((clip.trimStartSeconds+clip.durationSeconds)*rate);
    if (!Number.isSafeInteger(sourceLength)||sourceLength<0||sourceLength>28_800_000) {
      throw new RangeError('invalid fixture audio source length');
    }
    return {
      ...clip,
      sourceSamples:clip.sourceSamples??new Float32Array(sourceLength),
    };
  });
  const audio=mixDeterministicAudio({
    durationSeconds:metadata.durationSeconds,
    sampleRate:rate,
    clips,
    signal:input.signal,
  });
  input.signal?.throwIfAborted();
  return {...metadata,audio};
}
