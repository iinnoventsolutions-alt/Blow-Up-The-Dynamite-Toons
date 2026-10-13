import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { makeProject, makeScene, makePanel } from '../src/model.ts';
const server = spawn(process.execPath, ['desktop/preview.cjs'], { stdio: 'ignore' });
const url = 'http://127.0.0.1:4317';
for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true }); page.setDefaultTimeout(10000);
const metadata = JSON.parse(await readFile(new URL('../src/build-info.json', import.meta.url), 'utf8'));
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', dialog => dialog.accept());
const paint = () => page.waitForTimeout(150);
function fixture() { const p = makeProject(`Build ${metadata.build} acceptance`); p.scenes = [1, 2, 3].map(n => { const s = makeScene(`Scene ${n}`); s.panels = [1, 2, 3].map(k => makePanel(`Panel ${k}`)); return s; }); return p; }
const load = async (p, filename = 'build1.issb') => { await page.locator('input[type=file]').first().setInputFiles({ name: filename, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(p)) }); await paint(); };
const saved = async () => { const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save project', exact: true }).click(); const file = await pending; assert(file.suggestedFilename().endsWith('.issb')); return JSON.parse(await readFile(await file.path(), 'utf8')); };
const workspace = async (name) => { await page.getByRole('button', { name, exact: true }).click(); await paint(); };
const order = async (sceneId) => page.locator(`.scene-grid[data-scene-id="${sceneId}"] .panel-card`).evaluateAll(nodes => nodes.map(n => n.dataset.panelId));
async function dragWithCue(source, target) {
  await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
  const a = await source.boundingBox(), b = await target.boundingBox(); assert(a && b);
  await page.mouse.move(a.x + a.width * .5, a.y + Math.min(65, a.height * .5)); await page.mouse.down();
  await page.mouse.move(a.x + a.width * .5 + 20, a.y + Math.min(65, a.height * .5) + 5, { steps: 5 });
  await page.mouse.move(b.x + Math.min(8, b.width * .5), b.y + Math.min(65, b.height * .5), { steps: 12 });
  await page.waitForTimeout(150); assert.equal(await page.locator('.panel-drop-slot.active').count(), 1, 'An insertion line appears during drag');
  await page.mouse.up(); await paint();
}
try {
  await page.goto(url); assert.equal(await page.title(), 'Innovent Professional Storyboard');
  const p = fixture(), [s1, s2, s3] = p.scenes;
  await load(p, 'legacy.innovent');
  assert.deepEqual(await page.locator('.film-scene').evaluateAll(nodes => nodes.map(n => n.classList.contains('scene-shaded'))), [false, true, false]);
  await workspace('Panel');
  const boxes = await page.locator('.panel-overview .panel-card').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
  assert.equal(boxes[0].y, boxes[3].y, 'The next scene fills the remaining row position');
  assert(boxes[5].y > boxes[4].y, 'A scene continues onto the next row');
  assert.equal(boxes[5].x, boxes[0].x, 'Wrapped panels restart at the left edge');
  assert.deepEqual(await page.locator('.scene-grid').evaluateAll(nodes => nodes.map(n => n.classList.contains('scene-shaded'))), [false, true, false]);
  await workspace('Drawing'); assert.equal(await page.getByLabel('Duration in seconds').inputValue(), '5');
  assert((await page.locator('.status-bar').innerText()).includes(`Version ${metadata.version} · Build ${metadata.build}`));
  await page.getByTitle('Preferences', { exact: true }).click(); await page.getByLabel('Duration display and editing').selectOption('frames'); await page.getByRole('button', { name: 'Done', exact: true }).click();
  assert.equal(await page.getByLabel('Duration in frames').inputValue(), '120');
  await page.getByTitle('Preferences', { exact: true }).click(); await page.getByLabel('Duration display and editing').selectOption('time'); await page.getByRole('button', { name: 'Done', exact: true }).click();
  await workspace('Panel');
  await page.getByLabel('Select Scene 1 / Panel 2 for move', { exact: true }).check(); await page.getByLabel('Select Scene 1 / Panel 3 for move', { exact: true }).check();
  await page.getByRole('button', { name: 'Move selected…', exact: true }).click();
  await page.getByLabel('Destination scene for Scene 1 / Panel 3', { exact: true }).selectOption(s2.id);
  await page.getByLabel('Insert position for Scene 1 / Panel 3', { exact: true }).selectOption(s2.panels[1].id);
  await page.getByLabel('Destination scene for Scene 1 / Panel 2', { exact: true }).selectOption(s3.id);
  await page.getByRole('button', { name: 'Move 2 panels', exact: true }).click();
  assert.deepEqual(await order(s1.id), [s1.panels[0].id]);
  assert.deepEqual(await order(s2.id), [s2.panels[0].id, s1.panels[2].id, s2.panels[1].id, s2.panels[2].id]);
  assert.equal((await order(s3.id)).at(-1), s1.panels[1].id);
  await page.getByTitle('Undo (⌘/Ctrl Z)', { exact: true }).click(); assert.deepEqual(await order(s1.id), s1.panels.map(p => p.id));
  await page.getByTitle('Redo (⌘/Ctrl Shift Z)', { exact: true }).click(); assert.equal((await order(s3.id)).at(-1), s1.panels[1].id);
  console.log('Check: Panel drag'); await load(p); await workspace('Panel');
  await dragWithCue(page.locator(`[data-panel-id="${s1.panels[2].id}"]`), page.locator(`.scene-grid[data-scene-id="${s2.id}"] [data-before-panel="${s2.panels[1].id}"]`));
  assert.deepEqual(await order(s2.id), [s2.panels[0].id, s1.panels[2].id, s2.panels[1].id, s2.panels[2].id]);
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/build1-panel.png' });
  await workspace('Drawing'); assert.equal(await page.getByRole('button', { name: 'Move selected…', exact: true }).count(), 0);
  // Exercise Drawing drag/drop with two nearby scenes to avoid horizontal scroll during the gesture.
  console.log('Check: Drawing drag and scene reorder'); const small = fixture(); small.scenes = small.scenes.slice(0, 2); small.scenes[0].panels = small.scenes[0].panels.slice(0, 1); small.scenes[1].panels = small.scenes[1].panels.slice(0, 1);
  await load(small);
  await dragWithCue(page.locator(`[data-panel-id="${small.scenes[0].panels[0].id}"]`), page.locator(`.film-scene[data-scene-id="${small.scenes[1].id}"] [data-before-panel="end"]`));
  let output = await saved(); assert.equal(output.scenes[0].panels.length, 0); assert.equal(output.scenes[1].panels.length, 2);
  await page.getByTitle('Move scene Scene 1 later', { exact: true }).click(); output = await saved(); assert.equal(output.scenes[1].id, small.scenes[0].id);
  // Scene drag/drop keeps the scene contents together in both requested views.
  for (const view of ['Drawing', 'Panel']) {
    await load(small); await workspace(view);
    const source = page.getByRole('button', { name: 'Drag scene Scene 2', exact: true });
    const target = page.locator(`${view === 'Drawing' ? '.film-scene' : '.scene-grid'}[data-scene-id="${small.scenes[0].id}"] > .scene-drop-marker`);
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    await source.dispatchEvent('dragstart', { dataTransfer: transfer });
    await target.dispatchEvent('dragover', { dataTransfer: transfer });
    await paint(); assert.equal(await page.locator('.scene-drop-marker.active').count(), 1);
    await target.dispatchEvent('drop', { dataTransfer: transfer }); await paint();
    output = await saved(); assert.equal(output.scenes[0].id, small.scenes[1].id, `${view} allows dragging scenes`);
  }
  await page.reload(); await paint(); assert.equal(await page.getByRole('button', { name: '+ Create storyboard', exact: true }).count(), 1);
  console.log('Check: Timeline resize and playback'); await load(p); await workspace('Timeline');
  assert.equal(await page.locator('.filmstrip').count(), 0, 'Timeline has no redundant panel strip');
  assert((await page.locator('.timeline-preview').boundingBox()).height > 300, 'Timeline uses the freed space for the stage');
  const resize = page.getByRole('button', { name: 'Resize duration for Scene 1 / Panel 1', exact: true });
  const start = await resize.boundingBox(); assert(start);
  await page.mouse.move(start.x + start.width / 2, start.y + 45); await page.mouse.down(); await page.mouse.move(start.x + start.width / 2 + 96, start.y + 45, { steps: 10 }); await page.mouse.up(); await paint();
  assert.equal(await page.locator('.timeline-clip').first().getAttribute('data-duration'), '168');
  assert.equal(await page.getByLabel('Duration in seconds').inputValue(), '7');
  await page.screenshot({ path: 'test-results/build1-timeline.png' });
  output = await saved(); assert.equal(output.scenes[0].panels[0].duration, 168); assert.equal(output.scenes[0].panels[1].duration, 120);
  const next = await resize.boundingBox(); await page.mouse.move(next.x + next.width / 2, next.y + 45); await page.mouse.down(); await page.mouse.move(next.x + next.width / 2 - 120, next.y + 45, { steps: 10 }); await page.mouse.up(); await paint();
  assert.equal(await page.getByLabel('Duration in seconds').inputValue(), '4.5');
  await workspace('Drawing'); assert.equal(await page.locator('.film-scene-panels .panel-card').first().boundingBox().then(r => Math.round(r.width)), 180, 'Drawing thumbnail width remains fixed after timing resize');
  await workspace('Panel'); assert.equal(await page.locator('.grid-card').first().boundingBox().then(r => Math.round(r.width)), 200, 'Panel thumbnail width remains fixed after timing resize');
  await workspace('Timeline'); await page.getByTitle('Go to start', { exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForTimeout(250);
  const line = await page.locator('.timeline-playhead-line').evaluate(n => parseFloat(n.style.left)); assert(line > 0, 'Playhead moves during playback');
  await page.getByRole('button', { name: 'Pause', exact: true }).click(); const paused = await page.getByRole('slider', { name: 'Timeline playhead' }).getAttribute('aria-valuenow'); await page.waitForTimeout(180); assert.equal(await page.getByRole('slider', { name: 'Timeline playhead' }).getAttribute('aria-valuenow'), paused);
  await page.getByTitle('Stop playback', { exact: true }).click(); assert.equal(await page.getByRole('slider', { name: 'Timeline playhead' }).getAttribute('aria-valuenow'), '0');
  const ruler = await page.getByRole('slider', { name: 'Timeline playhead' }).boundingBox(); await page.mouse.click(ruler.x + 168, ruler.y + 16); assert.equal(await page.getByRole('slider', { name: 'Timeline playhead' }).getAttribute('aria-valuenow'), '84');
  const timed = fixture(); timed.scenes = [timed.scenes[0]]; timed.scenes[0].panels = timed.scenes[0].panels.slice(0, 2); timed.scenes[0].panels.forEach(p => { p.duration = 12; });
  await load(timed); await workspace('Timeline'); await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForTimeout(650); assert.equal(await page.locator('.timeline-clip.selected').getAttribute('data-panel-id'), timed.scenes[0].panels[1].id, 'Project playback crosses panel boundaries');
  await page.getByTitle('Stop playback', { exact: true }).click(); await page.setViewportSize({ width: 1100, height: 740 }); await paint();
  const transport = await page.locator('.timeline-transport').boundingBox(); assert(transport && transport.y > 0 && transport.x >= 0 && transport.x + transport.width <= 1100);
  assert(await page.locator('.timeline-view').evaluate(n => n.scrollHeight <= n.clientHeight || getComputedStyle(n).overflowY === 'auto'), 'A short window scrolls rather than clipping timeline controls');
  await page.screenshot({ path: 'test-results/build1-small-window.png' });
  assert.deepEqual(errors, []); console.log(`PASS Build ${metadata.build}: metadata, legacy import/.issb save, time preference, batch destinations, atomic undo, visual insertion cues, Drawing/Panel cross-scene dragging, empty scenes, scene reorder, stretch/squash, fixed thumbnails, playback, moving playhead, stop/pause, scrub, alternating scene shading, and dedicated Timeline layout.`);
} catch (error) { await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/build1-failure.png' }); console.error(errors); console.error((await page.locator('body').innerText()).slice(0, 2500)); throw error; }
finally { await browser.close(); server.kill(); }
