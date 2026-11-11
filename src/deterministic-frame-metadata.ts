/**
 * N3.2 isolated camera/transition metadata resolver for deterministic fixtures.
 * This does not replace production sequential-camera or transitionAt logic.
 */
import { scheduleDeterministicFrames, type N31ScheduleInput } from './deterministic-frame-scheduler';

export interface N32Keyframe { frame: number; x: number }
export interface N32CameraTrack { panelId: string; keyframes: readonly N32Keyframe[] }
export interface N32Transition { from: string; to: string; kind: 'dissolve'; frames: number }
export interface N32Fixture extends N31ScheduleInput {
  camera?: readonly N32CameraTrack[];
  transitions?: readonly N32Transition[];
  sceneStarts?: readonly string[];
}
export interface N32Frame {
  index: number; panelId: string; panelFrame: number; timestampUs: number;
  camera: { x: number };
  sceneStart: boolean;
  transition?: { kind: 'dissolve'; from: string; to: string; progress: number };
}
function interpolate(keys: readonly N32Keyframe[], frame: number): number {
  if (!keys.length) return 0;
  if (frame <= keys[0].frame) return keys[0].x;
  for (let i=1; i<keys.length; i++) {
    if (frame <= keys[i].frame) {
      const a=keys[i-1], b=keys[i];
      return a.x+(b.x-a.x)*(frame-a.frame)/(b.frame-a.frame);
    }
  }
  return keys[keys.length-1].x;
}
export function resolveDeterministicFrameMetadata(input: N32Fixture): {
  frames: N32Frame[]; durationSeconds: number;
} {
  const schedule=scheduleDeterministicFrames(input);
  const panelIds=new Set(input.panels.map(p=>p.id));
  if (panelIds.size !== input.panels.length) throw new RangeError('duplicate panel id');
  const camera=new Map<string,readonly N32Keyframe[]>();
  for (const track of input.camera??[]) {
    if (!panelIds.has(track.panelId)||camera.has(track.panelId)) throw new RangeError('invalid or duplicate camera track');
    let last=-1;
    const duration=input.panels.find(p=>p.id===track.panelId)!.frames;
    for (const k of track.keyframes) {
      if (!Number.isSafeInteger(k.frame)||k.frame<=last||k.frame>=duration||!Number.isFinite(k.x)) throw new RangeError('invalid camera keyframe');
      last=k.frame;
    }
    camera.set(track.panelId,track.keyframes);
  }
  const starts=new Set(input.sceneStarts??[input.panels[0].id]);
  if ([...starts].some(id=>!panelIds.has(id))) throw new RangeError('invalid scene start');
  const transitions=new Map<string,N32Transition>();
  for (const t of input.transitions??[]) {
    const index=input.panels.findIndex(p=>p.id===t.from);
    if (index<0||input.panels[index+1]?.id!==t.to||t.kind!=='dissolve'||!Number.isSafeInteger(t.frames)||t.frames<1||t.frames>input.panels[index].frames||transitions.has(t.from)||starts.has(t.to)) {
      throw new RangeError('invalid or cross-scene dissolve');
    }
    transitions.set(t.from,t);
  }
  const frames=schedule.frames.map(f=>{
    input.signal?.throwIfAborted();
    const entry:N32Frame={
      ...f,
      camera:{x:interpolate(camera.get(f.panelId)??[],f.panelFrame)},
      sceneStart:f.panelFrame===0&&starts.has(f.panelId),
    };
    const t=transitions.get(f.panelId);
    if(t) {
      const duration=input.panels.find(p=>p.id===f.panelId)!.frames;
      const transitionFrame=f.panelFrame-(duration-t.frames);
      if(transitionFrame>=0)entry.transition={kind:'dissolve',from:t.from,to:t.to,progress:(transitionFrame+1)/t.frames};
    }
    return entry;
  });
  input.signal?.throwIfAborted();
  return {frames,durationSeconds:schedule.durationSeconds};
}
