import { cameraAt, sceneFrames, uid, type CameraKey, type Panel, type Project, type Scene } from './model.ts';
export type CameraPose = Pick<CameraKey, 'x' | 'y' | 'zoom' | 'rotation'>;
export const localPanelStart = (scene: Scene, panel: Panel) => { let frame = 0; for (const p of scene.panels) { if (p.id === panel.id) return frame; frame += p.duration; } return 0; };
export const sceneStart = (project: Project, scene: Scene) => { let frame = 0; for (const s of project.scenes) { if (s.id === scene.id) return frame; frame += sceneFrames(s); } return 0; };
export function cameraCorners(pose: CameraPose, project: Project): [number, number][] {
  const a = pose.rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), w = project.width / (2 * pose.zoom), h = project.height / (2 * pose.zoom);
  return [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => [pose.x + x * c - y * s, pose.y + x * s + y * c]);
}
export function putCameraKey(scene: Scene, project: Project, frame: number, values: Partial<CameraPose & Pick<CameraKey, 'interpolation'>> = {}) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= sceneFrames(scene)) throw new Error('Camera key must be inside the scene.');
  const existing = scene.camera.find(k => k.frame === frame);
  const pose = cameraAt(scene, frame, project);
  // Poses may originate from an endpoint key; never copy its ID or frame.
  const key: CameraKey = { id: existing?.id || uid(), frame, x: values.x ?? pose.x, y: values.y ?? pose.y, zoom: values.zoom ?? pose.zoom, rotation: values.rotation ?? pose.rotation, interpolation: values.interpolation ?? existing?.interpolation ?? 'linear' };
  if (existing) Object.assign(existing, key); else scene.camera.push(key);
  scene.camera.sort((a, b) => a.frame - b.frame);
  return key;
}
export function moveCameraKey(scene: Scene, id: string, frame: number) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= sceneFrames(scene)) throw new Error('Camera key must be inside the scene.');
  if (scene.camera.some(k => k.id !== id && k.frame === frame)) throw new Error('Another camera key already occupies that frame.');
  const key = scene.camera.find(k => k.id === id); if (!key) throw new Error('Camera key no longer exists.'); key.frame = frame; scene.camera.sort((a, b) => a.frame - b.frame);
}

export type PanelCameraClipboard={duration:number;keys:Array<Pick<CameraKey,'frame'|'x'|'y'|'zoom'|'rotation'|'interpolation'>>};
export function copyPanelCamera(scene:Scene,panel:Panel,project:Project):PanelCameraClipboard{
 const start=localPanelStart(scene,panel),end=start+panel.duration-1;
 return {duration:panel.duration,keys:[...new Set([start,...scene.camera.filter(k=>k.frame>start&&k.frame<end).map(k=>k.frame),end])].map(frame=>({...cameraAt(scene,frame,project),frame:frame-start,interpolation:scene.camera.find(k=>k.frame===frame)?.interpolation||'linear'}))};
}
export function pastePanelCamera(scene:Scene,panel:Panel,project:Project,clip:PanelCameraClipboard){
 const start=localPanelStart(scene,panel),end=start+panel.duration-1;
 const before=start>0?cameraAt(scene,start-1,project):null,after=end<sceneFrames(scene)-1?cameraAt(scene,end+1,project):null;
 scene.camera=scene.camera.filter(k=>k.frame<start||k.frame>end);
 const mapped=new Map<number,typeof clip.keys[number]>();
 for(const k of clip.keys)mapped.set(start+Math.round(k.frame/Math.max(1,clip.duration-1)*(panel.duration-1)),k);
 for(const [frame,k] of mapped)putCameraKey(scene,project,frame,k);
 if(before&&!scene.camera.some(k=>k.frame===start-1))putCameraKey(scene,project,start-1,before);
 if(after&&!scene.camera.some(k=>k.frame===end+1))putCameraKey(scene,project,end+1,after);
}
export function resetPanelCamera(scene:Scene,panel:Panel,project:Project){
 const start=localPanelStart(scene,panel),end=start+panel.duration-1;
 const before=start>0?cameraAt(scene,start-1,project):null,after=end<sceneFrames(scene)-1?cameraAt(scene,end+1,project):null;
 scene.camera=scene.camera.filter(k=>k.frame<start||k.frame>end);
 const pose={x:project.width/2,y:project.height/2,zoom:1,rotation:0};
 putCameraKey(scene,project,start,pose);if(end!==start)putCameraKey(scene,project,end,pose);
 if(before&&!scene.camera.some(k=>k.frame===start-1))putCameraKey(scene,project,start-1,before);
 if(after&&!scene.camera.some(k=>k.frame===end+1))putCameraKey(scene,project,end+1,after);
}
