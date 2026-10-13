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
  const key = { ...(existing || { ...cameraAt(scene, frame, project), id: uid(), frame, interpolation: 'linear' as const }), ...values };
  if (existing) Object.assign(existing, key); else scene.camera.push(key);
  scene.camera.sort((a, b) => a.frame - b.frame);
  return key;
}
export function moveCameraKey(scene: Scene, id: string, frame: number) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= sceneFrames(scene)) throw new Error('Camera key must be inside the scene.');
  if (scene.camera.some(k => k.id !== id && k.frame === frame)) throw new Error('Another camera key already occupies that frame.');
  const key = scene.camera.find(k => k.id === id); if (!key) throw new Error('Camera key no longer exists.'); key.frame = frame; scene.camera.sort((a, b) => a.frame - b.frame);
}
