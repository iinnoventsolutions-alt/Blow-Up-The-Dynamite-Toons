const test = require('node:test');
const assert = require('node:assert/strict');
const { exportPdf } = require('../desktop/pdf-export.cjs');

const pdf = () => Uint8Array.from(Buffer.from('%PDF-1.7\n%%EOF')).buffer;
async function attempt(data, name, openAfter = false) {
  const calls = [];
  const dialog = { showSaveDialog: async (_win, options) => {
    calls.push(options);
    return { canceled: true };
  } };
  const shell = { openPath: async () => { throw new Error('Unexpected open'); } };
  const result = await exportPdf(data, name, openAfter, { dialog, shell, win: {} });
  return { result, calls };
}

test('SA-4 rejects malformed PDF input before opening the save dialog', async () => {
  let opened = false;
  const dialog = { showSaveDialog: async () => { opened = true; return { canceled: true }; } };
  const shell = { openPath: async () => '' };
  for (const value of [null, 'PDF', new ArrayBuffer(0), Uint8Array.from(Buffer.from('not-pdf')).buffer]) {
    await assert.rejects(exportPdf(value, 'bad.pdf', false, { dialog, shell, win: {} }));
  }
  assert.equal(opened, false);
});

test('SA-4 strips Windows and Unix directory components from suggested PDF names', async () => {
  for (const name of ['../../private/report.pdf', 'C:\\private\\report.pdf']) {
    const { calls } = await attempt(pdf(), name);
    assert.equal(calls[0].defaultPath, 'report.pdf');
  }
});

test('SA-4 sanitizes dangerous filename characters and supplies a fallback', async () => {
  assert.equal((await attempt(pdf(), 'bad:<name>?*.pdf')).calls[0].defaultPath, 'badname.pdf');
  assert.equal((await attempt(pdf(), '...')).calls[0].defaultPath, 'Storyboard.pdf');
  assert.equal((await attempt(pdf(), null)).calls[0].defaultPath, 'Storyboard.pdf');
});

test('SA-4 does not write or open a file when the export dialog is canceled', async () => {
  const { result, calls } = await attempt(pdf(), 'draft', true);
  assert.equal(result, null);
  assert.equal(calls[0].defaultPath, 'draft.pdf');
});
