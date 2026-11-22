#!/usr/bin/env node
// RI2.15.5-C2.3: generate a fail-closed electron-builder config for ONE architecture.
// Does not execute electron-builder, enable export, or authorize redistribution.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hashes=JSON.parse(fs.readFileSync(path.join(repo,'release-audit/ri2-15-5-b3-approved-hashes.json'),'utf8'));
const binaries=['bin/ffmpeg','lib/libvpx.12.dylib','lib/libopus.0.dylib'];
const notices=['FFmpeg-n7.1.1-LICENSE.md','FFmpeg-n7.1.1-COPYING.LGPLv2.1','libvpx-v1.16.0-LICENSE','opus-v1.6.1-COPYING'];
const sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function checkFile(f){if(!fs.lstatSync(f).isFile())throw Error('Not a regular file: '+f)}
function validateStaged(arch,stage){
 if(!['arm64','x64'].includes(arch))throw Error('Invalid architecture');
 const root=fs.realpathSync(stage);
 for(const rel of binaries){
  const f=path.join(root,'ffmpeg-runtime',rel);checkFile(f);
  if(sha(f)!==hashes[arch][rel])throw Error('B3 checksum mismatch: '+rel);
 }
 for(const name of notices){
  const f=path.join(root,'third-party-licenses',name);checkFile(f);
  const upstream=path.join(repo,'release-audit','licenses',name);
  if(sha(f)!==sha(upstream))throw Error('Notice mismatch: '+name);
 }
 const status=fs.readFileSync(path.join(root,'STAGING-STATUS.txt'),'utf8');
 if(!status.includes('Architecture: '+arch+'\n')||!status.includes('redistribution NOT authorized'))throw Error('Staging status invalid');
 return root;
}
function createConfig(arch,stage,outputFile){
 const root=validateStaged(arch,stage);
 const base=JSON.parse(fs.readFileSync(path.join(repo,'package.json'),'utf8')).build;
 if(!base||base.extraResources)throw Error('Unexpected preexisting packaging resource configuration');
 const output=path.resolve(outputFile);
 if(fs.existsSync(output))throw Error('Config destination exists');
 const config={...base,directories:{...base.directories,output:'release/ri2-c23-'+arch},
  extraResources:[
   {from:path.join(root,'ffmpeg-runtime'),to:'ffmpeg-runtime',filter:['**/*']},
   {from:path.join(root,'third-party-licenses'),to:'third-party-licenses',filter:['**/*']},
   {from:path.join(root,'STAGING-STATUS.txt'),to:'STAGING-STATUS.txt'}
  ]};
 fs.writeFileSync(output,JSON.stringify(config,null,2)+'\n',{flag:'wx'});
 return output;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==5)throw Error('Usage: node scripts/ri2-generate-electron-config.mjs <arm64|x64> <C2-staged-dir> <new-config.json>');
  console.log('RI2.15.5-C2.3 CONFIG READY (NOT BUILT):',createConfig(process.argv[2],process.argv[3],process.argv[4]));
 }catch(e){console.error('RI2.15.5-C2.3 FAIL:',e.message);process.exitCode=1}
}
export {validateStaged,createConfig};
