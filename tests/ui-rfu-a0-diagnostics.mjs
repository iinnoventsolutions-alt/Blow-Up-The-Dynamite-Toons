import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
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
  // Audio fixtures use the model's validated factory methods and are added in follow-up tests.
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
  while (Date.now() - started < 3500) {
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
  record('RFU1', !backward && maxFreeze < 250, 'samples=' + frames.length + ', repeated=' + gaps + ', longest unchanged interval=' + maxFreeze + 'ms');
  await writeFile('test-results/rfu-a0-diagnostics.json', JSON.stringify({ results, playback: frames }, null, 2));
  console.log('RFU-A0 diagnostic completed; findings are non-gating until fixes and acceptance tests are approved.');
} catch (error) {
  console.error('RFU-A0 diagnostic setup failed:', error);
  throw error;
} finally {
  await browser.close();
  server.kill();
}
