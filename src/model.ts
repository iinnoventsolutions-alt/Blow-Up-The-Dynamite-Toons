import { validateProject } from './project-format.js';
export type Point = [number, number, number];
export type Stroke = { id: string; tool: 'brush' | 'eraser'; color: string; size: number; points: Point[] };
export type Layer = { id: string; name: string; visible: boolean; locked: boolean; opacity: number; strokes: Stroke[]; image?: string };
export type Panel = { id: string; name: string; duration: number; dialogue: string; action: string; slugging: string; notes: string; layers: Layer[] };
export type CameraKey = { id: string; frame: number; x: number; y: number; zoom: number; rotation: number; interpolation: 'linear' | 'hold' | 'ease' };
export type Scene = { id: string; name: string; panels: Panel[]; camera: CameraKey[] };
export type Project = { format: 'innovent-storyboard'; schemaVersion: 1; id: string; title: string; subtitle: string; width: number; height: number; fps: number; scenes: Scene[] };
export const uid = () => crypto.randomUUID();
export const makeLayer = (name = 'Drawing') : Layer => ({ id: uid(), name, visible: true, locked: false, opacity: 1, strokes: [] });
export const makePanel = (name = 'Panel 1', fps = 24): Panel => ({ id: uid(), name, duration: fps * 5, dialogue: '', action: '', slugging: '', notes: '', layers: [makeLayer()] });
export const makeScene = (name = 'Scene 1', fps = 24): Scene => ({ id: uid(), name, panels: [makePanel('Panel 1', fps)], camera: [] });
export function makeProject(title = 'Untitled storyboard', width = 1920, height = 1080, fps = 24, subtitle = ''): Project {
  return validateProject({ format: 'innovent-storyboard', schemaVersion: 1, id: uid(), title, subtitle, width, height, fps, scenes: [makeScene('Scene 1', fps)] });
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
    if (found.scene.camera.length || target.camera.length) throw new Error('Panel moves involving camera-keyed scenes are blocked to preserve their camera timing. Move the whole scene instead, or use a scene without camera keys.');
    if (move.beforePanelId && (selected.has(move.beforePanelId) || !target.panels.some(p => p.id === move.beforePanelId))) throw new Error('Choose a destination anchor that is not one of the moving panels.');
    return { move, panel: found.panel };
  });
  return editProject(project, draft => {
    const copies = new Map(allPanels(draft).filter(p => selected.has(p.panel.id)).map(p => [p.panel.id, p.panel]));
    for (const scene of draft.scenes) scene.panels = scene.panels.filter(p => !selected.has(p.id));
    for (const { move } of payload) {
      const target = draft.scenes.find(s => s.id === move.sceneId)!;
      const index = move.beforePanelId ? target.panels.findIndex(p => p.id === move.beforePanelId) : target.panels.length;
      target.panels.splice(index, 0, copies.get(move.panelId)!);
    }
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
  const draft = structuredClone(project); edit(draft); return validateProject(draft);
}
export function duplicatePanel(panel: Panel): Panel {
  const copy = structuredClone(panel); copy.id = uid(); copy.name = `${panel.name} copy`;
  for (const layer of copy.layers) { layer.id = uid(); for (const stroke of layer.strokes) stroke.id = uid(); }
  return copy;
}
export function changeDuration(scene: Scene, panel: Panel, duration: number) {
  if (!Number.isInteger(duration) || duration < 1) throw new Error('Duration must be a positive whole number of frames.');
  const nextTotal = sceneFrames(scene) - panel.duration + duration;
  if (scene.camera.some(k => k.frame >= nextTotal)) throw new Error('This duration would leave a camera key beyond the scene. Move the key first.');
  panel.duration = duration;
}
export type History = { past: Project[]; present: Project; future: Project[] };
export const newHistory = (project: Project): History => ({ past: [], present: project, future: [] });
export function commit(h: History, next: Project, limit = 50): History {
  if (JSON.stringify(h.present) === JSON.stringify(next)) return h;
  return { past: [...h.past, h.present].slice(-limit), present: next, future: [] };
}
export function undo(h: History): History {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}
export function redo(h: History): History {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}
export function cameraAt(scene: Scene, frame: number, project: Project) {
  const keys = [...scene.camera].sort((a, b) => a.frame - b.frame);
  const base = { x: project.width / 2, y: project.height / 2, zoom: 1, rotation: 0 };
  if (!keys.length) return base;
  let a = keys[0], b = keys[keys.length - 1];
  if (frame <= a.frame) return a;
  if (frame >= b.frame) return b;
  for (let i = 1; i < keys.length; i++) { if (keys[i].frame >= frame) { a = keys[i - 1]; b = keys[i]; break; } }
  let t = (frame - a.frame) / (b.frame - a.frame);
  if (a.interpolation === 'hold') t = 0;
  if (a.interpolation === 'ease') t = t * t * (3 - 2 * t);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, zoom: a.zoom + (b.zoom - a.zoom) * t, rotation: a.rotation + (b.rotation - a.rotation) * t };
}
