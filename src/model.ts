import { validateProject } from './project-format.js';
export type Point = [number, number, number];
export type Stroke = { id: string; tool: 'brush' | 'pencil' | 'eraser' | 'shape' | 'text' | 'fill' | 'image'; color: string; size: number; points: Point[]; contours?: Point[][]; outline?: Point[]; opacity?: number; texture?: 'solid' | 'graphite' | 'chalk'; cap?: 'round' | 'butt' | 'square'; capStart?: 'round' | 'butt' | 'square'; capEnd?: 'round' | 'butt' | 'square'; join?: 'round' | 'bevel' | 'miter'; shape?: 'rectangle' | 'ellipse' | 'line'; fill?: string; text?: string; font?: string; fontSize?: number; bold?: boolean; italic?: boolean; align?: 'left' | 'center' | 'right'; tracking?: number; lineSpacing?: number; indent?: number; autoKern?: boolean; textScaleX?: number; rotation?: number; source?: string };
export type Layer = { id: string; name: string; visible: boolean; locked: boolean; opacity: number; strokes: Stroke[]; image?: string; kind?: 'vector' | 'bitmap' };
export type Panel = { id: string; name: string; duration: number; dialogue: string; action: string; slugging: string; notes: string; layers: Layer[] };
export type CameraKey = { id: string; frame: number; x: number; y: number; zoom: number; rotation: number; interpolation: 'linear' | 'hold' | 'ease' };
export type Scene = { id: string; name: string; panels: Panel[]; camera: CameraKey[] };
export type Transition = {id:string;fromId:string;toId:string;type:'dissolve'|'edge-wipe'|'clock-wipe'|'slide';duration:number;direction:'left'|'right'|'up'|'down'};
export type AudioAsset={id:string;name:string;source:string;duration:number;sampleRate:number;channels:number;peaks:number[]};
export type AudioClip={id:string;assetId:string;name:string;start:number;offset:number;duration:number;gain:number};
export type AudioTrack={id:string;name:string;gain:number;mute:boolean;solo:boolean;clips:AudioClip[]};
export type Project = { format: 'innovent-storyboard'; schemaVersion: 4; id: string; title: string; subtitle: string; width: number; height: number; fps: number; scenes: Scene[]; transitions: Transition[];audioAssets:AudioAsset[];audioTracks:AudioTrack[] };
export const uid = () => crypto.randomUUID();
export const makeLayer = (name = 'Drawing', kind: 'vector' | 'bitmap' = 'vector') : Layer => ({ id: uid(), name, kind, visible: true, locked: false, opacity: 1, strokes: [] });
export const makePanel = (name = 'Panel 1', fps = 24): Panel => ({ id: uid(), name, duration: fps * 5, dialogue: '', action: '', slugging: '', notes: '', layers: [makeLayer()] });
export const makeScene = (name = 'Scene 1', fps = 24): Scene => ({ id: uid(), name, panels: [makePanel('Panel 1', fps)], camera: [] });
export function makeProject(title = 'Untitled storyboard', width = 1920, height = 1080, fps = 24, subtitle = ''): Project {
  return validateProject({ format: 'innovent-storyboard', schemaVersion: 4, transitions: [], audioAssets:[], audioTracks:[], id: uid(), title, subtitle, width, height, fps, scenes: [makeScene('Scene 1', fps)] });
}
export function findPanel(project: Project, panelId: string) {
  for (const scene of project.scenes) { const panel = scene.panels.find(p => p.id === panelId); if (panel) return { scene, panel }; }
  return undefined;
}
export const allPanels = (p: Project) => p.scenes.flatMap(scene => scene.panels.map(panel => ({ scene, panel })));
export const sceneFrames = (s: Scene) => s.panels.reduce((sum, p) => sum + p.duration, 0);
export const projectFrames = (p: Project) => p.scenes.reduce((sum, s) => sum + sceneFrames(s), 0);
export function timecode(frames: number, fps: number) {
  const seconds = Math.floor(frames / fps);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}:${(frames % fps).toString().padStart(2, '0')}`;
}
export function secondsText(frames: number, fps: number): string {
  return (frames / fps).toFixed(6).replace(/\.?0+$/, '');
}
export function secondsToFrames(seconds: number, fps: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Duration must be a positive time in seconds.');
  const frames = Math.round(seconds * fps);
  if (frames < 1 || frames > 360000) throw new Error('Duration must be between one frame and 360,000 frames.');
  return frames;
}
export type PanelMove = { panelId: string; sceneId: string; beforePanelId: string | null };
export function movePanels(project: Project, moves: PanelMove[]): Project {
  if (!moves.length) return project;
  const selected = new Set(moves.map(m => m.panelId));
  if (selected.size !== moves.length) throw new Error('A panel may appear only once in a move.');
  const payload = moves.map(move => {
    const found = findPanel(project, move.panelId), target = project.scenes.find(s => s.id === move.sceneId);
    if (!found || !target) throw new Error('A source panel or destination scene no longer exists.');
    if (move.beforePanelId && (selected.has(move.beforePanelId) || !target.panels.some(p => p.id === move.beforePanelId))) throw new Error('Choose a destination anchor that is not one of the moving panels.');
    return { move, panel: found.panel };
  });
  const affected=new Set(payload.flatMap(({move})=>[findPanel(project,move.panelId)!.scene.id,move.sceneId]));
  return editProject(project, draft => {
    const copies = new Map(allPanels(draft).filter(p => selected.has(p.panel.id)).map(p => [p.panel.id, p.panel]));
    for (const scene of draft.scenes) scene.panels = scene.panels.filter(p => !selected.has(p.id));
    for (const { move } of payload) {
      const target = draft.scenes.find(s => s.id === move.sceneId)!;
      const index = move.beforePanelId ? target.panels.findIndex(p => p.id === move.beforePanelId) : target.panels.length;
      target.panels.splice(index, 0, copies.get(move.panelId)!);
    }
    rebuildPanelCameras(project,draft,affected);
  });
}
export function moveScene(project: Project, sceneId: string, beforeSceneId: string | null): Project {
  if (sceneId === beforeSceneId) return project;
  return editProject(project, draft => {
    const index = draft.scenes.findIndex(s => s.id === sceneId);
    if (index < 0 || (beforeSceneId && !draft.scenes.some(s => s.id === beforeSceneId))) throw new Error('Scene no longer exists.');
    const [scene] = draft.scenes.splice(index, 1);
    const destination = beforeSceneId ? draft.scenes.findIndex(s => s.id === beforeSceneId) : draft.scenes.length;
    draft.scenes.splice(destination, 0, scene);
  });
}
export function panelStart(project: Project, id: string): number {
  let frame = 0;
  for (const { panel } of allPanels(project)) { if (panel.id === id) return frame; frame += panel.duration; }
  return 0;
}
export function panelAtFrame(project: Project, frame: number) {
  const panels = allPanels(project); let remaining = Math.max(0, Math.min(projectFrames(project) - 1, Math.floor(frame)));
  for (const entry of panels) { if (remaining < entry.panel.duration) return entry; remaining -= entry.panel.duration; }
  return panels[panels.length - 1];
}
export function editProject(project: Project, edit: (draft: Project) => void): Project {
  const draft = structuredClone(project); edit(draft);
  const before=allPanels(project).map(e=>e.panel.id).join(','),entries=allPanels(draft);
  if(before!==entries.map(e=>e.panel.id).join(','))draft.transitions=draft.transitions.filter(t=>entries.some((e,i)=>e.panel.id===t.fromId&&entries[i+1]?.panel.id===t.toId));
  for(const t of draft.transitions){const from=entries.find(e=>e.panel.id===t.fromId)?.panel;if(from&&from.duration<t.duration)t.duration=from.duration;}
  draft.transitions=draft.transitions.filter(t=>t.duration>=2);
  return validateProject(draft);
}
/** Replace only the edited panel branch; unchanged scenes, panels and history stay shared.
 * When validate=false the caller MUST call serializeProject before entering history.
 * This avoids a redundant full-project validation in App's artwork commit path.
 * Other consumers retain the validated default. */
export function editPanelLayers(project: Project, panelId: string, layers: Layer[], validate = true): Project {
  let found = false;
  const scenes = project.scenes.map(scene => {
    if (!scene.panels.some(panel => panel.id === panelId)) return scene;
    return {
      ...scene,
      panels: scene.panels.map(panel => {
        if (panel.id !== panelId) return panel;
        found = true;
        return { ...panel, layers };
      })
    };
  });
  if (!found) throw new Error('Panel no longer exists.');
  const next = { ...project, scenes };
  return validate ? validateProject(next) : next;
}
export function duplicatePanel(panel: Panel): Panel {
  const copy = structuredClone(panel); copy.id = uid(); copy.name = `${panel.name} copy`;
  for (const layer of copy.layers) { layer.id = uid(); for (const stroke of layer.strokes) stroke.id = uid(); }
  return copy;
}
export function changeDuration(scene: Scene, panel: Panel, duration: number) {
  if (!Number.isInteger(duration) || duration < 1) throw new Error('Duration must be a positive whole number of frames.');
  let start=0; for (const p of scene.panels) { if(p.id===panel.id)break;start+=p.duration; }
  const delta=duration-panel.duration, end=start+panel.duration;
  const frames=scene.camera.map(k=>k.frame<start?k.frame:k.frame>=end?k.frame+delta:start+Math.round((k.frame-start)/Math.max(1,panel.duration-1)*(duration-1)));
  if(new Set(frames).size!==frames.length)throw new Error('Shortening this panel would merge camera keys. Move or delete a key first.');
  scene.camera.forEach((k,i)=>{k.frame=frames[i];});
  panel.duration = duration;
}
export type History = { past: Project[]; present: Project; future: Project[] };
export const newHistory = (project: Project): History => ({ past: [], present: project, future: [] });
export function commitChanged(h: History, next: Project, limit = 50): History {
  // Caller has already compared validated serialized project content.
  return { past: [...h.past, h.present].slice(-limit), present: next, future: [] };
}
export function commit(h: History, next: Project, limit = 50): History {
  if (JSON.stringify(h.present) === JSON.stringify(next)) return h;
  return commitChanged(h, next, limit);
}
export function undo(h: History): History {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}
export function redo(h: History): History {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}
function cameraSegment(keys:CameraKey[],frame:number):[CameraKey|undefined,CameraKey|undefined]{
 let lo=0,hi=keys.length;while(lo<hi){const mid=(lo+hi)>>>1;if(keys[mid].frame<=frame)lo=mid+1;else hi=mid;}
 return [keys[lo-1],keys[lo]];
}
function cameraPose(a:CameraKey|undefined,b:CameraKey|undefined,frame:number,project:Project){
 if(!a)return b||{x:project.width/2,y:project.height/2,zoom:1,rotation:0};
 if(!b||a.frame===frame)return a;
 let t=(frame-a.frame)/(b.frame-a.frame);
 if(a.interpolation==='hold')t=0;if(a.interpolation==='ease')t=t*t*(3-2*t);
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,zoom:a.zoom+(b.zoom-a.zoom)*t,rotation:a.rotation+(b.rotation-a.rotation)*t};
}
export function cameraAt(scene:Scene,frame:number,project:Project){
 const keys=[...scene.camera].sort((a,b)=>a.frame-b.frame),[a,b]=cameraSegment(keys,frame);
 return cameraPose(a,b,frame,project);
}

// Rebuild only structurally affected scenes. Boundary poses isolate each panel,
// so moving a neutral panel into a keyed scene never inherits its neighbor's move.
// Clipped ease segments are sampled at project frames; intact ease segments retain
// their original keys/interpolation. No change to absolute audio positions.
export function rebuildPanelCameras(before:Project,after:Project,affected:Set<string>,duplicates=new Map<string,string>()){
 const origins=new Map(allPanels(before).map(e=>[e.panel.id,e]));
 for(const target of after.scenes){
  if(!affected.has(target.id))continue;
  const previous=before.scenes.find(s=>s.id===target.id);if(previous&&previous.panels.map(p=>p.id).join(',')===target.panels.map(p=>p.id).join(','))continue;
  const keyed=before.scenes.find(s=>s.id===target.id)?.camera.length||target.panels.some(p=>origins.get(duplicates.get(p.id)||p.id)?.scene.camera.length);
  if(!keyed){target.camera=[];continue;}
  const keys:CameraKey[]=[];let destination=0;
  for(const panel of target.panels){
   const origin=origins.get(duplicates.get(panel.id)||panel.id);
   if(!origin)throw new Error('Cannot locate original camera timing for this panel.');
   let start=0;for(const p of origin.scene.panels){if(p.id===origin.panel.id)break;start+=p.duration;}
   const sourceKeys=[...origin.scene.camera].sort((a,b)=>a.frame-b.frame);
   const end=start+origin.panel.duration-1,frames=new Set([start,end]);
   for(const key of sourceKeys)if(key.frame>=start&&key.frame<=end)frames.add(key.frame);
   for(let i=0;i<sourceKeys.length-1;i++){
    const a=sourceKeys[i],b=sourceKeys[i+1];
    if(a.interpolation==='ease'&&(a.frame<start||b.frame>end)){
     const lo=Math.max(start,a.frame),hi=Math.min(end,b.frame);
     if(hi-lo>10000)throw new Error('This edit needs more than 10,000 camera samples to preserve a cross-panel ease. Shorten that move or split it with camera keys first.');
     for(let frame=lo;frame<=hi;frame++)frames.add(frame);
    }
   }
   for(const frame of [...frames].sort((a,b)=>a-b)){
    const [a,b]=cameraSegment(sourceKeys,frame),exact=a?.frame===frame?a:undefined,pose=cameraPose(a,b,frame,before);
    const interpolation=a?.interpolation==='ease'&&b&&(a.frame<start||b.frame>end)?'linear':a?.interpolation||'linear';
    keys.push({id:exact&&!duplicates.has(panel.id)?exact.id:uid(),frame:destination+frame-start,x:pose.x,y:pose.y,zoom:pose.zoom,rotation:pose.rotation,interpolation});
    if(keys.length>10000)throw new Error('This edit would exceed 10,000 camera keys in a scene. Reduce camera complexity first. No panels were changed.');
   }
   destination+=panel.duration;
  }
  target.camera=keys;
 }
}
export function removeStoryboardPanel(project:Project,panelId:string){
 const found=findPanel(project,panelId);if(!found)throw new Error('Panel no longer exists.');
 if(found.scene.panels.length<=1)throw new Error('Keep at least one panel per scene.');
 return editProject(project,draft=>{const s=draft.scenes.find(s=>s.id===found.scene.id)!;s.panels=s.panels.filter(p=>p.id!==panelId);rebuildPanelCameras(project,draft,new Set([s.id]));});
}
export function duplicateStoryboardPanel(project:Project,panelId:string){
 const found=findPanel(project,panelId);if(!found)throw new Error('Panel no longer exists.');
 const copy=duplicatePanel(found.panel);
 const next=editProject(project,draft=>{const scene=draft.scenes.find(s=>s.id===found.scene.id)!;scene.panels.splice(scene.panels.findIndex(p=>p.id===panelId)+1,0,copy);rebuildPanelCameras(project,draft,new Set([scene.id]),new Map([[copy.id,panelId]]));});
 return {project:next,panelId:copy.id};
}
