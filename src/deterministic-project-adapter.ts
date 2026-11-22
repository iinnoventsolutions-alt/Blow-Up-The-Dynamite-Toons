/**
 * RFDR N3.5 — read-only projection from real storyboard project data.
 * This is an isolated inspection/scheduling seam, NOT a production renderer.
 * Resolve camera through the accepted compatibility dispatch, never through
 * the simplified N3.2 fixture interpolation.
 */
import { allPanels, cameraAt, projectFrames, type Project, type StaticCameraPose, type Transition } from './model.ts';
import { resolveCompatibleCamera } from './sequential-camera.ts';
import { transitionAt } from './transitions.ts';
import { scheduleDeterministicFrames } from './deterministic-frame-scheduler.ts';

export interface N35Frame {
  index: number;
  timestampUs: number;
  panelId: string;
  panelFrame: number;
  sceneId: string;
  sceneStart: boolean;
  camera: StaticCameraPose;
  cameraEngine: 'legacy' | 'sequential';
  transition?: {
    id: string;
    type: Transition['type'];
    direction: Transition['direction'];
    fromId: string;
    toId: string;
    progress: number;
  };
}
export interface N35AudioWindow {
  trackId: string;
  clipId: string;
  assetId: string;
  startFrame: number;
  offsetFrames: number;
  durationFrames: number;
  gain: number;
}
export interface N35ProjectSchedule {
  fps: number;
  totalFrames: number;
  durationSeconds: number;
  frames: N35Frame[];
  audioWindows: N35AudioWindow[];
}
/**
 * Projects remain untouched; audio is timing metadata only (no decoding or
 * PCM), and artwork is not rendered. Keep timestamps integer and avoid
 * interpolating camera/transition data separately from the production paths.
 */
export function inspectDeterministicProject(project: Project, signal?: AbortSignal): N35ProjectSchedule {
  signal?.throwIfAborted();
  const entries = allPanels(project);
  const scheduled = scheduleDeterministicFrames({
    fps: project.fps,
    panels: entries.map(({panel}) => ({id:panel.id,frames:panel.duration})),
    signal,
  });
  if (scheduled.totalFrames !== projectFrames(project)) throw new Error('Project timing mismatch.');
  const byId = new Map(entries.map(e=>[e.panel.id,e]));
  if (byId.size !== entries.length) throw new RangeError('Duplicate panel ID.');
  const sceneFirst = new Set(project.scenes.map(s=>s.panels[0]?.id));
  const sceneOffset = new Map<string,number>();
  let start = 0;
  for (const scene of project.scenes) {
    sceneOffset.set(scene.id,start);
    start += scene.panels.reduce((sum,p)=>sum+p.duration,0);
  }
  const frames = scheduled.frames.map(f=>{
    signal?.throwIfAborted();
    const entry = byId.get(f.panelId)!;
    const cameraResult = resolveCompatibleCamera(project,entry.scene.id,entry.panel.id,f.panelFrame);
    // Match playback-render's legacy camera evaluation, including keyed
    // scenes. A static overlay only applies when legacy scene keys are empty.
    const camera = entry.scene.sequentialCamera
      ? cameraResult.pose
      : entry.scene.camera.length > 0
        ? cameraAt(entry.scene,f.index-sceneOffset.get(entry.scene.id)!,project)
        : cameraResult.pose;
    const frame:N35Frame = {
      ...f,
      sceneId: entry.scene.id,
      sceneStart: f.panelFrame === 0 && sceneFirst.has(f.panelId),
      camera: {x:camera.x,y:camera.y,zoom:camera.zoom,rotation:camera.rotation},
      cameraEngine:cameraResult.engine,
    };
    const t = transitionAt(project,f.index);
    if(t){
      // Reuse production transitionAt semantics: duration-1 denominator,
      // including the exact final progress=1 sample.
      frame.transition={
        id:t.transition.id,type:t.transition.type,
        direction:t.transition.direction,fromId:t.transition.fromId,
        toId:t.transition.toId,progress:t.progress,
      };
    }
    return frame;
  });
  const solo = project.audioTracks.some(t=>t.solo);
  const audioWindows:N35AudioWindow[] = [];
  for(const track of project.audioTracks){
    signal?.throwIfAborted();
    if(track.mute || (solo && !track.solo))continue;
    for(const clip of track.clips){
      signal?.throwIfAborted();
      const startFrame=Math.max(0,clip.start);
      const endFrame=Math.min(scheduled.totalFrames,clip.start+clip.duration);
      if(endFrame<=startFrame)continue;
      audioWindows.push({
        trackId:track.id,clipId:clip.id,assetId:clip.assetId,
        startFrame,offsetFrames:clip.offset+startFrame-clip.start,
        durationFrames:endFrame-startFrame,gain:track.gain*clip.gain,
      });
    }
  }
  signal?.throwIfAborted();
  return {fps:project.fps,totalFrames:scheduled.totalFrames,durationSeconds:scheduled.durationSeconds,frames,audioWindows};
}
