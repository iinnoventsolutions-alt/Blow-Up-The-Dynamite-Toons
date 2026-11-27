/** D2: independent MP4/MOV discovery; no renderer or IPC activation. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const execute = promisify(execFile);
function resolveMp4Mov(resources, {platform=process.platform, release=os.release()}={}) {
  if (platform !== 'darwin' || Number(release.split('.')[0]) < 24 || !/^\d+\./.test(release))
    throw new Error('MP4/MOV requires macOS 15 or later');
  if (typeof resources !== 'string' || !path.isAbsolute(resources)) throw new TypeError('Invalid resources path');
  let current = fs.realpathSync(resources);
  for (const part of ['ffmpeg-mp4-mov-runtime','bin','ffmpeg']) {
    current = path.join(current,part);
    const st = fs.lstatSync(current);
    if (st.isSymbolicLink() || (part === 'ffmpeg' ? !st.isFile() || !(st.mode & 0o111) : !st.isDirectory()))
      throw new Error('Invalid MP4/MOV runtime component');
  }
  return current;
}
async function probeMp4Mov(resources, {signal, platform, release, run=execute}={}) {
  signal?.throwIfAborted();
  const binary = resolveMp4Mov(resources,{platform,release});
  const query = async flag => {
    signal?.throwIfAborted();
    const {stdout} = await run(binary,['-hide_banner',flag],{shell:false,timeout:10000,maxBuffer:65536,encoding:'utf8',signal});
    signal?.throwIfAborted();
    return stdout;
  };
  const version = await query('-version');
  if (!/^ffmpeg version 7\.1\.5(?:\s|$)/m.test(version)) throw new Error('Unexpected MP4/MOV FFmpeg version');
  const encoders = await query('-encoders');
  const muxers = await query('-muxers');
  if (!/^\s*V[A-Z.]{5}\s+h264_videotoolbox\s/m.test(encoders) ||
      !/^\s*A[A-Z.]{5}\s+aac\s/m.test(encoders) ||
      !/^\s*E\s+mp4\s/m.test(muxers) || !/^\s*E\s+mov\s/m.test(muxers))
    throw new Error('Required MP4/MOV capabilities missing');
  return Object.freeze({binary,version:'7.1.5',formats:Object.freeze(['mp4','mov'])});
}
module.exports = {resolveMp4Mov,probeMp4Mov};
