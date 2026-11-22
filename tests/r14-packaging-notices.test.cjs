const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {copyNotices} = require('../scripts/production-ffmpeg-afterpack.cjs');

test('R1.4-C production packaging includes exact FFmpeg and codec license notices', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'r14-notices-'));
  const expected = [
    'FFmpeg-n7.1.1-LICENSE.md',
    'FFmpeg-n7.1.1-COPYING.LGPLv2.1',
    'libvpx-v1.16.0-LICENSE',
    'opus-v1.6.1-COPYING',
  ];
  try {
    await copyNotices(root);
    const licenses = path.join(root, 'third-party-licenses');
    assert.deepEqual((await fs.readdir(licenses)).sort(), expected.slice().sort());
    for (const name of expected) {
      const actual = await fs.readFile(path.join(licenses, name));
      const source = await fs.readFile(path.join(__dirname, '..', 'release-audit', 'licenses', name));
      assert.deepEqual(actual, source, name);
    }
    await assert.rejects(copyNotices(root), {code: 'EEXIST'}, 'Must not overwrite notices');
  } finally {
    await fs.rm(root, {recursive: true, force: true});
  }
});
