/**
 * N3.1 isolated deterministic frame scheduler.
 * Pure scheduling only: no pixels, muxing, camera, transitions, or audio.
 * Not imported by the production animatic exporter.
 */
export interface N31Panel { id: string; frames: number }
export interface N31ScheduleInput {
  fps: number;
  panels: readonly N31Panel[];
  signal?: AbortSignal;
}
export interface N31Frame {
  index: number;
  panelId: string;
  panelFrame: number;
  timestampUs: number;
}
export interface N31Schedule {
  frames: N31Frame[];
  durationSeconds: number;
  totalFrames: number;
}
export function scheduleDeterministicFrames(input: N31ScheduleInput): N31Schedule {
  input.signal?.throwIfAborted();
  if (!Number.isSafeInteger(input.fps) || input.fps <= 0) throw new RangeError('fps must be a positive integer');
  if (!input.panels.length) throw new RangeError('at least one panel is required');
  let total = 0;
  for (const panel of input.panels) {
    if (!panel.id || !Number.isSafeInteger(panel.frames) || panel.frames <= 0) {
      throw new RangeError('each panel requires an id and positive integer frame count');
    }
    total += panel.frames;
    if (!Number.isSafeInteger(total) || total > 1_000_000) throw new RangeError('frame count exceeds safe scheduling limit');
  }
  const frames: N31Frame[] = [];
  for (const panel of input.panels) {
    for (let local = 0; local < panel.frames; local++) {
      input.signal?.throwIfAborted();
      const index = frames.length;
      frames.push({
        index, panelId: panel.id, panelFrame: local,
        timestampUs: Math.round(index * 1_000_000 / input.fps),
      });
    }
  }
  input.signal?.throwIfAborted();
  return { frames, totalFrames: total, durationSeconds: total / input.fps };
}
