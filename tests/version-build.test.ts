import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-version-'));
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.mkdirSync(path.join(root, 'src'));
  for (const filename of ['package.json', 'package-lock.json']) {
    fs.copyFileSync(path.join(sourceRoot, filename), path.join(root, filename));
  }
  fs.copyFileSync(path.join(sourceRoot, 'src/build-info.json'), path.join(root, 'src/build-info.json'));
  fs.copyFileSync(path.join(sourceRoot, 'scripts/set-build.mjs'), path.join(root, 'scripts/set-build.mjs'));
  return root;
}
function invoke(root: string, ...args: string[]) {
  return spawnSync(process.execPath, [path.join(root, 'scripts/set-build.mjs'), ...args], {encoding: 'utf8'});
}
function read(root: string, name: string) {
  return JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
}

test('V1124-P0 metadata has synchronized version and build', () => {
  const metadata = read(sourceRoot, 'src/build-info.json');
  const pkg = read(sourceRoot, 'package.json');
  const lock = read(sourceRoot, 'package-lock.json');
  assert.equal(metadata.version, '1.1.24');
  assert.equal(metadata.build, '11252026.0155');
  assert.equal(pkg.version, metadata.version);
  assert.equal(pkg.issb.version, metadata.version);
  assert.equal(pkg.issb.build, metadata.build);
  assert.equal(lock.version, metadata.version);
  assert.equal(lock.packages[''].version, metadata.version);
});

test('V1124-P0 build-only changes retain the semantic version', t => {
  const root = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const result = invoke(root, '11262026.1030');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(read(root, 'src/build-info.json').version, '1.1.24');
  assert.equal(read(root, 'src/build-info.json').build, '11262026.1030');
  assert.equal(read(root, 'package.json').version, '1.1.24');
});

test('V1124-P0 semantic version updates synchronize metadata and lockfile', t => {
  const root = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const result = invoke(root, '11272026.0900', '--version', '1.1.25');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(read(root, 'src/build-info.json').version, '1.1.25');
  assert.equal(read(root, 'package.json').version, '1.1.25');
  assert.equal(read(root, 'package-lock.json').version, '1.1.25');
});

test('V1124-P0 backwards versions and malformed timestamps do not write files', t => {
  const root = fixture();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const before = fs.readFileSync(path.join(root, 'src/build-info.json'), 'utf8');
  for (const args of [
    ['11252026.0200', '--version', '1.1.23'],
    ['11252026.0200', '--version', '1.1'],
    ['02302026.1200'],
    ['11252026.2461'],
  ]) {
    const result = invoke(root, ...args);
    assert.notEqual(result.status, 0, 'Unexpected success: ' + args.join(' '));
    assert.equal(fs.readFileSync(path.join(root, 'src/build-info.json'), 'utf8'), before);
  }
});
