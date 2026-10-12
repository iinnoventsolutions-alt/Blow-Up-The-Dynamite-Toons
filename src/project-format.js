export const SCHEMA_VERSION = 1;
export const MAX_PROJECT_BYTES = 25 * 1024 * 1024;
const fail = (message) => { throw new Error(message); };
const record = (v) => v && typeof v === 'object' && !Array.isArray(v);
export function validateProject(value) {
  if (!record(value) || value.format !== 'innovent-storyboard') fail('This is not an Innovent Professional Storyboard project.');
  if (value.schemaVersion !== SCHEMA_VERSION) fail('Unsupported project version. Your file has not been changed.');
  const ids = new Set();
  const id = (v) => { if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(v) || ids.has(v)) fail('Invalid or duplicate object ID.'); ids.add(v); };
  const str = (v, max = 10000) => { if (typeof v !== 'string' || v.length > max) fail('Invalid project text.'); };
  const num = (v, min, max, integer = false) => { if (!Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) fail('Invalid project number.'); };
  const arr = (v, min, max) => { if (!Array.isArray(v) || v.length < min || v.length > max) fail('Invalid project collection.'); };
  const color = (v) => { if (typeof v !== 'string' || !/^#[a-fA-F0-9]{6}$/.test(v)) fail('Invalid drawing color.'); };
  id(value.id); str(value.title, 200); str(value.subtitle, 500);
  num(value.width, 64, 8192, true); num(value.height, 64, 8192, true);
  if (![12, 24, 25, 30, 48, 50, 60].includes(value.fps)) fail('Unsupported frame rate.');
  arr(value.scenes, 1, 500); let panels = 0, points = 0;
  for (const scene of value.scenes) {
    if (!record(scene)) fail('Invalid scene.'); id(scene.id); str(scene.name, 200); arr(scene.panels, 0, 1000);
    panels += scene.panels.length; if (panels > 2000) fail('Too many panels for this developer build.');
    for (const panel of scene.panels) {
      if (!record(panel)) fail('Invalid panel.'); id(panel.id); str(panel.name, 200); num(panel.duration, 1, 360000, true);
      for (const key of ['dialogue', 'action', 'slugging', 'notes']) str(panel[key]);
      arr(panel.layers, 1, 50);
      for (const layer of panel.layers) {
        if (!record(layer)) fail('Invalid layer.'); id(layer.id); str(layer.name, 200);
        if (typeof layer.visible !== 'boolean' || typeof layer.locked !== 'boolean') fail('Invalid layer state.');
        num(layer.opacity, 0, 1); arr(layer.strokes, 0, 20000);
        if (layer.image !== undefined && (typeof layer.image !== 'string' || layer.image.length > 12 * 1024 * 1024 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(layer.image))) fail('Invalid embedded image.');
        for (const stroke of layer.strokes) {
          if (!record(stroke) || !['brush', 'eraser'].includes(stroke.tool)) fail('Invalid stroke.'); id(stroke.id); color(stroke.color); num(stroke.size, 0.1, 1000);
          arr(stroke.points, 1, 100000); points += stroke.points.length;
          if (points > 1000000) fail('Drawing exceeds this developer build’s point limit.');
          for (const p of stroke.points) { if (!Array.isArray(p) || p.length !== 3) fail('Invalid stroke point.'); num(p[0], -8192, 16384); num(p[1], -8192, 16384); num(p[2], 0, 1); }
        }
      }
    }
    arr(scene.camera, 0, 10000); const times = new Set(); const duration = scene.panels.reduce((a, p) => a + p.duration, 0);
    for (const key of scene.camera) {
      if (!record(key)) fail('Invalid camera key.'); id(key.id); num(key.frame, 0, duration - 1, true);
      if (times.has(key.frame)) fail('Camera keys must have distinct frame times.'); times.add(key.frame);
      num(key.x, -8192, 16384); num(key.y, -8192, 16384); num(key.zoom, 0.01, 100); num(key.rotation, -36000, 36000);
      if (!['linear', 'hold', 'ease'].includes(key.interpolation)) fail('Invalid camera interpolation.');
    }
  }
  if (panels < 1) fail('A storyboard must contain at least one panel.');
  return value;
}
export function parseProject(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > MAX_PROJECT_BYTES) fail('Project must be smaller than 25 MB in this developer build.');
  let value; try { value = JSON.parse(text); } catch { fail('The project file is not valid JSON.'); }
  return validateProject(value);
}
export function serializeProject(project) {
  validateProject(project); const text = JSON.stringify(project); parseProject(text); return text;
}
