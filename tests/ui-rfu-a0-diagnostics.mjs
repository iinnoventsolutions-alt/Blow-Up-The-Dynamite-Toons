import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { makeProject, makePanel } from '../src/model.ts';

// Diagnostic only: intentionally separate from npm run test:ui until RFU fixes are accepted.
const server = spawn(process.execPath, ['desktop/preview.cjs'], { stdio: 'ignore' });
for (let i = 0; i < 100; i++) {
  try { if ((await fetch('http://127.0.0.1:4317')).ok) break; } catch {}
  await new Promise(resolve => setTimeout(resolve, 100));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 }, acceptDownloads: true });
page.setDefaultTimeout(10000);
const results = [];
const record = (id, ok, detail) => { results.push({ id, passed: ok, detail }); console.log((ok ? 'PASS' : 'REPRO') + ' ' + id + ': ' + detail); };
try {
  await mkdir('test-results', { recursive: true });
  await page.goto('http://127.0.0.1:4317');
  const project = makeProject('RFU-A0 reproduction');
  for (let i = 0; i < 11; i++) project.scenes[0].panels.push(makePanel('Panel ' + (i + 2)));
  for (const panel of project.scenes[0].panels) panel.duration = project.fps * 5;
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'rfu-a0.issb', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project))
  });
  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  const scroller = page.locator('.timeline-scroll');
  const controls = page.getByLabel('Timeline playback controls', { exact: true });
  await scroller.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  const before = await scroller.evaluate(el => el.scrollLeft);
  assert(before > 100, 'Fixture must overflow the Timeline viewport');
  await controls.getByTitle('Go to start').click();
  await page.waitForTimeout(180);
  const after = await scroller.evaluate(el => el.scrollLeft);
  record('RFU5', after <= 2, 'Go to Start scrollLeft=' + after + ' (before=' + before + ')');
  await page.screenshot({ path: 'test-results/rfu-a0-timeline-seek.png' });

  const slider = page.getByRole('slider', { name: 'Timeline playhead' });
  const frames = [];
  await controls.getByRole('button', { name: 'Play', exact: true }).click();
  const started = Date.now();
  while (Date.now() - started < 12000) {
    frames.push({ t: Date.now() - started, frame: Number(await slider.getAttribute('aria-valuenow')) });
    await page.waitForTimeout(65);
  }
  await controls.getByRole('button', { name: 'Pause', exact: true }).click();
  const gaps = frames.slice(1).filter((s, i) => s.frame === frames[i].frame).length;
  const maxFreeze = frames.reduce((state, sample) => {
    if (sample.frame !== state.last) { state.last = sample.frame; state.since = sample.t; }
    state.longest = Math.max(state.longest, sample.t - state.since);
    return state;
  }, { last: -1, since: 0, longest: 0 }).longest;
  const backward = frames.some((s, i) => i && s.frame < frames[i - 1].frame);
  const expectedAdvance = (frames.at(-1).t - frames[0].t) * project.fps / 1000;
  const actualAdvance = frames.at(-1).frame - frames[0].frame;
  const driftFrames = Math.abs(actualAdvance - expectedAdvance);
  record('RFU1', !backward && maxFreeze < 250 && driftFrames < project.fps, 'samples=' + frames.length + ', repeated=' + gaps + ', longest unchanged interval=' + maxFreeze + 'ms, drift=' + driftFrames.toFixed(1) + ' frames over 12s');
  // RFU6: real pointer drags and persisted project verification (non-gating).
  // Generate a short PCM WAV and import it through the actual application controls.
  const rate = 16000, count = rate * 2, wav = Buffer.alloc(44 + count * 2);
  wav.write('RIFF'); wav.writeUInt32LE(36 + count * 2, 4);
  wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) wav.writeInt16LE(Math.sin(i * 2 * Math.PI * 440 / rate) * 5000, 44 + i * 2);
  await page.locator('input[accept*=".wav"]').setInputFiles({ name: 'RFU6.wav', mimeType: 'audio/wav', buffer: wav });
  await page.waitForFunction(() => document.querySelectorAll('.audio-clip').length === 1);
  await page.getByRole('button', { name: '+ Audio track', exact: true }).click();
  const saveProject = async () => {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save project', exact: true }).click();
    return JSON.parse(await readFile(await (await pending).path(), 'utf8'));
  };
  const outcomes = [];
  await page.evaluate(() => { window.__rfu6PointerEvents = []; for (const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture']) document.addEventListener(type, e => { if (window.__rfu6PointerEvents.length < 1000) window.__rfu6PointerEvents.push({type, x:Math.round(e.clientX), y:Math.round(e.clientY), target:e.target?.className?.toString().slice(0,70), captured:document.querySelector('.audio-lanes')?.hasPointerCapture(e.pointerId)}); }, true); });
  for (let attempt = 0; attempt < 6; attempt++) {
    const clip = page.locator('.audio-clip').first();
    await clip.scrollIntoViewIfNeeded();
    const start = await saveProject();
    // Saving shows a toast that can cover the clip; clear it before pointer testing.
    const saveToast = page.getByRole('status').filter({ hasText: 'Project file downloaded.' });
    if (await saveToast.isVisible()) await saveToast.getByTitle('Dismiss message').click();
    const source = start.audioTracks.find(t => t.clips.length);
    const destination = start.audioTracks.find(t => t.id !== source.id);
    const box = await clip.boundingBox();
    const target = page.locator('[data-audio-track="' + destination.id + '"]');
    const targetBox = await target.boundingBox();
    const x = box.x + Math.min(box.width / 2, 28), y = box.y + 20;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 24, targetBox.y + targetBox.height / 2, { steps: attempt % 2 ? 3 : 14 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    const saved = await saveProject();
    const moved = saved.audioTracks.find(t => t.clips.some(c => c.id === source.clips[0].id));
    const newClip = moved?.clips.find(c => c.id === source.clips[0].id);
    const ok = moved?.id === destination.id && newClip?.start > source.clips[0].start;
    const events = await page.evaluate(() => window.__rfu6PointerEvents.splice(0));
    outcomes.push({ attempt, from: source.id, to: destination.id, actual: moved?.id, oldStart: source.clips[0].start, newStart: newClip?.start, passed: ok, pointerEvents: events });
  }
  record('RFU6', outcomes.every(o => o.passed), outcomes.filter(o => o.passed).length + '/' + outcomes.length + ' cross-track drags persisted');
  await page.screenshot({ path: 'test-results/rfu-a0-audio-drag.png' });
  await writeFile('test-results/rfu-a0-diagnostics.json', JSON.stringify({ results, playback: frames, audioDrags: outcomes }, null, 2));
  console.log('RFU-A0 diagnostic completed; findings are non-gating until fixes and acceptance tests are approved.');
} catch (error) {
  console.error('RFU-A0 diagnostic setup failed:', error);
  throw error;
} finally {
  await browser.close();
  server.kill();
}
