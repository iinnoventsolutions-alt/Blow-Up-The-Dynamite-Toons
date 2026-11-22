const path = require('node:path');
const { atomicWrite } = require('./persistence.cjs');
async function exportPdf(data, name, openAfter, { dialog, shell, win }) {
  if (!(data instanceof ArrayBuffer) || data.byteLength > 128 * 1024 * 1024) throw new Error('PDF exceeds the 128 MB export limit.');
  const bytes = Buffer.from(data);
  if (bytes.subarray(0,5).toString() !== '%PDF-') throw new Error('Invalid PDF document.');
  const baseName = typeof name === 'string' ? name.replace(/\\/g, '/').split('/').pop() : '';
  const cleanName = baseName.replace(/[\x00-\x1f\x7f<>:"|?*]/g, '').replace(/^\.+/, '').trim().slice(0, 120);
  const safeName = cleanName ? (cleanName.toLowerCase().endsWith('.pdf') ? cleanName : cleanName + '.pdf') : 'Storyboard.pdf';
  const result = await dialog.showSaveDialog(win, { defaultPath: safeName, filters: [{ name: 'Storyboard PDF', extensions: ['pdf'] }] });
  if (result.canceled) return null;
  const destination = result.filePath.toLowerCase().endsWith('.pdf') ? result.filePath : result.filePath + '.pdf';
  await atomicWrite(destination, bytes);
  if (openAfter === true) { const error = await shell.openPath(destination); if (error) throw new Error('PDF saved, but could not be opened: ' + error); }
  return { name: path.basename(destination) };
}
module.exports = { exportPdf };
