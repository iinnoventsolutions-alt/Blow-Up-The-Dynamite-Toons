/** D2 optional staging of the exact accepted pre-signing candidates. */
const fs = require('node:fs/promises');
const path = require('node:path');
const {constants} = require('node:fs');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const candidates = Object.freeze({
  arm64: {arch:'arm64', hash:'0df991541e71a905ad10440ac77dd258e3fb767034ac96eef093d43c8cb0f50c'},
  x64: {arch:'x86_64', hash:'08dede9aa5eb3ca5b2c3bf2896d56c8737008cbfa796dbbcc2c2523a97fdcb3c'}
});
const materials = [
  'licenses/FFmpeg-7.1.5-LICENSE.md',
  'licenses/FFmpeg-7.1.5-COPYING.LGPLv2.1',
  'THIRD-PARTY-NOTICE.txt',
  'source/ffmpeg-7.1.5.tar.xz',
  'build/rebuild-intel.sh',
  'BUILD-INSTRUCTIONS.txt'
];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function stageMp4Mov(resources, architecture, {env=process.env, inspect=execFileSync}={}) {
  if (!Object.hasOwn(candidates,architecture)) throw new Error('Unsupported MP4/MOV architecture');
  const variable = architecture === 'arm64' ? 'V1124_MP4_MOV_ARM64_DIR' : 'V1124_MP4_MOV_X64_DIR';
  const source = env[variable];
  if (source === undefined) return false;
  if (!path.isAbsolute(source)) throw new Error(variable+' must be an absolute staging path');
  const root = await fs.realpath(source);
  const candidate = candidates[architecture];
  const entries = [];
  for (const relative of ['bin/ffmpeg',...materials]) {
    let current = root;
    const parts = relative.split('/');
    for (let i=0;i<parts.length;i++) {
      current = path.join(current,parts[i]);
      const st = await fs.lstat(current);
      if (st.isSymbolicLink() || (i===parts.length-1 ? !st.isFile() || !st.size : !st.isDirectory()))
        throw new Error('Invalid MP4/MOV staging component: '+relative);
    }
    const bytes = await fs.readFile(current);
    if (relative === 'bin/ffmpeg') {
      if (digest(bytes)!==candidate.hash) throw new Error('MP4/MOV candidate checksum mismatch');
      if (inspect('lipo',['-archs',current],{encoding:'utf8'}).trim()!==candidate.arch)
        throw new Error('MP4/MOV architecture mismatch');
    }
    if (relative === 'source/ffmpeg-7.1.5.tar.xz' && digest(bytes)!=='de668509caf9e35e3cd162473441fdb29538c6d96ed080292b3cf9e6fc5d558f')
      throw new Error('MP4/MOV source checksum mismatch');
    entries.push({relative,bytes});
  }
  const target = path.join(resources,'ffmpeg-mp4-mov-runtime');
  await fs.mkdir(target);
  try {
    for (const {relative,bytes} of entries) {
      const destination = path.join(target,relative);
      await fs.mkdir(path.dirname(destination),{recursive:true});
      await fs.writeFile(destination,bytes,{flag:'wx',mode:relative==='bin/ffmpeg'?0o755:0o644});
    }
  } catch(error) {
    await fs.rm(target,{recursive:true,force:true});
    throw error;
  }
  return true;
}
module.exports = {stageMp4Mov};
