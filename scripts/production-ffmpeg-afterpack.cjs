/** R1.2 production packaging: fail closed unless a validated, architecture-matched runtime is supplied. */
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {constants} = require('node:fs');
const {createHash} = require('node:crypto');
// License texts previously staged by RI2 C2.2 must also ship with production DMGs.
const notices = [
  'FFmpeg-n7.1.1-LICENSE.md',
  'FFmpeg-n7.1.1-COPYING.LGPLv2.1',
  'libvpx-v1.16.0-LICENSE',
  'opus-v1.6.1-COPYING',
];
const licenseSource = path.resolve(__dirname, '..', 'release-audit', 'licenses');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function copyNotices(resources) {
  const destination = path.join(resources, 'third-party-licenses');
  // Check all inputs before writing anything to avoid partial notice packages.
  const entries = [];
  for (const name of notices) {
    const source = path.join(licenseSource, name);
    const stat = await fs.lstat(source);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 500) {
      throw new Error('Missing or incomplete third-party notice: ' + name);
    }
    entries.push({name, source, sourceHash: digest(await fs.readFile(source))});
  }
  await fs.mkdir(destination, {recursive: true});
  for (const {name, source, sourceHash} of entries) {
    const target = path.join(destination, name);
    // Never overwrite another resource silently.
    await fs.copyFile(source, target, constants.COPYFILE_EXCL);
    if (digest(await fs.readFile(target)) !== sourceHash) {
      throw new Error('Third-party notice content changed during packaging: ' + name);
    }
  }
}

// electron-builder Arch enum: x64=1, arm64=3. Accept named values for compatibility.
const required = ['bin/ffmpeg', 'lib/libvpx.12.dylib', 'lib/libopus.0.dylib'];
async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const architecture = context.arch === 3 || context.arch === 'arm64' ? 'arm64' : context.arch === 1 || context.arch === 'x64' ? 'x64' : null;
  if (!architecture) throw new Error('Unsupported macOS packaging architecture');
  const variable = architecture === 'arm64' ? 'RI2_FFMPEG_ARM64_DIR' : 'RI2_FFMPEG_X64_DIR';
  const source = process.env[variable];
  if (!source || !path.isAbsolute(source)) throw new Error(variable + ' must be an absolute path to the validated FFmpeg runtime');
  const root = await fs.realpath(source);
  for (const relative of required) {
    const resolved = await fs.realpath(path.join(root, relative));
    if (!resolved.startsWith(root + path.sep)) throw new Error('FFmpeg runtime contains an external symlink: ' + relative);
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) throw new Error('FFmpeg runtime component is not a file: ' + relative);
    const architectures = execFileSync('lipo', ['-archs', resolved], {encoding:'utf8'}).trim().split(/\s+/);
    const expected = architecture === 'x64' ? 'x86_64' : 'arm64';
    if (!architectures.includes(expected)) throw new Error('Incorrect FFmpeg component architecture: ' + relative);
  }
  const appName = context.packager.appInfo.productFilename + '.app';
  const resources = path.join(context.appOutDir, appName, 'Contents', 'Resources');
  const target = path.join(resources, 'ffmpeg-runtime');
  await fs.cp(root, target, {recursive:true, force:false, errorOnExist:true, dereference:false});
  const binary = path.join(target, 'bin', 'ffmpeg');
  // Do not execute an Intel binary on an ARM64 CI host without Rosetta.
  // Runtime execution is validated during architecture-specific acceptance.
  await fs.chmod(binary, 0o755);
  await copyNotices(resources);
  await require('./mp4-mov-afterpack.cjs').stageMp4Mov(resources, architecture);
}
module.exports = afterPack;
module.exports.copyNotices = copyNotices;
