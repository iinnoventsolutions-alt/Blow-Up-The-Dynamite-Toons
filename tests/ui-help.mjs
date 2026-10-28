import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const server = process.env.APP_URL ? null : spawn(process.execPath, ['desktop/preview.cjs'], { stdio: 'ignore' });
const url = process.env.APP_URL || 'http://127.0.0.1:4317';
let browser;
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(url)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.getByTitle('Help and About').click();
  const dialog = page.getByRole('dialog', { name: 'Help and About' });
  await dialog.waitFor();
  assert.equal(await dialog.getByRole('button', { name: 'All', exact: true }).getAttribute('aria-pressed'), 'true');
  await dialog.getByRole('button', { name: 'Camera', exact: true }).click();
  assert.equal(await dialog.getByRole('button', { name: 'Camera', exact: true }).getAttribute('aria-pressed'), 'true');
  await dialog.getByRole('heading', { name: 'Camera keyframes' }).waitFor();
  assert.equal(await dialog.getByRole('heading', { name: 'Getting started' }).count(), 0);
  await dialog.getByLabel('Search help topics').fill('Paste & Fit');
  await dialog.getByRole('heading', { name: 'Copy, paste, and reset camera' }).waitFor();
  assert.equal(await dialog.getByRole('heading', { name: 'Camera keyframes' }).count(), 0);
  await dialog.getByLabel('Search help topics').fill('not-a-real-help-topic');
  await dialog.getByText('No matching help topics. Try a different search term.').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0, 'Escape closes help dialog');

  await page.getByRole('button', { name: '+ Create storyboard', exact: true }).click();
  await page.getByLabel(/^project title$/i).fill('Help acceptance');
  await page.getByRole('button', { name: 'Create project →', exact: true }).click();
  await page.getByRole('button', { name: 'Help for this workspace' }).click();
  await dialog.waitFor();
  assert.equal(await dialog.getByRole('button', { name: 'Drawing', exact: true }).getAttribute('aria-pressed'), 'true');
  await dialog.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  await page.getByRole('button', { name: 'Help for this workspace' }).click();
  await dialog.waitFor();
  assert.equal(await dialog.getByRole('button', { name: 'Playback', exact: true }).getAttribute('aria-pressed'), 'true');
  await dialog.getByRole('button', { name: 'Done' }).click();
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('PASS Help Center: offline search, categories, contextual workspace entry, Escape and Done dismissal.');
} finally {
  await browser?.close();
  server?.kill();
}
