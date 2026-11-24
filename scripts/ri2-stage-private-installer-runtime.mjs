#!/usr/bin/env node
// RI2.15.5-C2.2: verified staging only. No installer build, release or production activation.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(repo,'release-audit/ri2-15-5-b3-approved-hashes.json'),'utf8'));
const notices=['FFmpeg-n7.1.1-LICENSE.md','FFmpeg-n7.1.1-COPYING.LGPLv2.1','libvpx-v1.16.0-LICENSE','opus-v1.6.1-COPYING'];
const files=['bin/ffmpeg','lib/libvpx.12.dylib','lib/libopus.0.dylib'];
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function verifySource(root,arch){
 const expected=manifest[arch];
 if(!expected||Object.keys(expected).sort().join('|')!==files.slice().sort().join('|'))throw Error('Invalid approved hash manifest');
 for(const rel of files){
  const source=path.join(root,rel);
  if(!fs.lstatSync(source).isFile())throw Error('Non-regular runtime file: '+rel);
  if(hash(source)!==expected[rel])throw Error('Approved SHA-256 mismatch: '+rel);
 }
 for(const notice of notices){
  const source=path.join(repo,'release-audit','licenses',notice);
  if(!fs.lstatSync(source).isFile()||fs.statSync(source).size<500)throw Error('Missing/incomplete license notice: '+notice);
 }
}
function stage(arch,sourceRoot,destination){
 if(!['arm64','x64'].includes(arch))throw Error('Architecture must be arm64 or x64');
 const root=path.resolve(sourceRoot),target=path.resolve(destination);
 if(target===root||target.startsWith(root+path.sep)||root.startsWith(target+path.sep))throw Error('Source and destination overlap');
 if(fs.existsSync(target))throw Error('Destination must not exist; refusing overwrite');
 verifySource(root,arch); // fail before creating any output
 const temp=target+'.staging-'+process.pid;
 if(fs.existsSync(temp))throw Error('Temporary staging directory already exists');
 try{
  for(const rel of files){
   const dest=path.join(temp,'ffmpeg-runtime',rel);
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.copyFileSync(path.join(root,rel),dest,fs.constants.COPYFILE_EXCL);
   fs.chmodSync(dest,rel==='bin/ffmpeg'?0o755:0o644);
   if(hash(dest)!==manifest[arch][rel])throw Error('Staged checksum mismatch: '+rel);
  }
  for(const notice of notices){
   const dest=path.join(temp,'third-party-licenses',notice);
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.copyFileSync(path.join(repo,'release-audit','licenses',notice),dest,fs.constants.COPYFILE_EXCL);
  }
  fs.writeFileSync(path.join(temp,'STAGING-STATUS.txt'),
   'RI2.15.5-C2.2 internal test staging only; redistribution NOT authorized.\n'+
   'Corresponding source, build scripts and license obligations require separate review.\n'+
   'Original CI run: 44661662574\nArchitecture: '+arch+'\n');
  fs.renameSync(temp,target);
 }catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e}
 return target;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==5)throw Error('Usage: node scripts/ri2-stage-private-installer-runtime.mjs <arm64|x64> <verified-runtime-root> <new-output-dir>');
  console.log('STAGED FOR INTERNAL TEST ONLY:',stage(process.argv[2],process.argv[3],process.argv[4]));
 }catch(e){console.error('RI2.15.5-C2.2 FAIL:',e.message);process.exitCode=1}
}
export {stage};
