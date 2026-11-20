#!/usr/bin/env node
// RI2.15.5-C2.4: inspect an unpacked macOS app. Read-only; no release authorization.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const approved=JSON.parse(fs.readFileSync(path.join(repo,'release-audit/ri2-15-5-b3-approved-hashes.json'),'utf8'));
const rels=['bin/ffmpeg','lib/libvpx.12.dylib','lib/libopus.0.dylib'];
const notices=['FFmpeg-n7.1.1-LICENSE.md','FFmpeg-n7.1.1-COPYING.LGPLv2.1','libvpx-v1.16.0-LICENSE','opus-v1.6.1-COPYING'];
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function inspect(app,arch){
 if(!['arm64','x64'].includes(arch))throw Error('Unsupported architecture');
 if(process.platform!=='darwin')throw Error('Run on macOS');
 const root=fs.realpathSync(app);
 if(!root.endsWith('.app'))throw Error('Expected unpacked .app directory');
 const resources=path.join(root,'Contents','Resources');
 const expected=arch==='arm64'?'arm64':'x86_64';
 const checked=[];
 for(const rel of rels){
  const p=path.join(resources,'ffmpeg-runtime',rel);
  if(!fs.lstatSync(p).isFile())throw Error('Missing or nonregular runtime file: '+rel);
  if(sha(p)!==approved[arch][rel])throw Error('Packaged SHA-256 mismatch: '+rel);
  const info=execFileSync('lipo',['-archs',p],{encoding:'utf8'}).trim().split(/\s+/);
  if(info.length!==1||info[0]!==expected)throw Error('Wrong architecture: '+rel+' '+info.join(','));
  const deps=execFileSync('otool',['-L',p],{encoding:'utf8'});
  if(/\/opt\/homebrew\/|\/usr\/local\//.test(deps))throw Error('Homebrew dependency in '+rel);
  for(const line of deps.split('\n').slice(1)){
   const dep=line.trim().split(' (')[0];
   if(!dep)continue;
   if(dep.startsWith('@executable_path/../lib/')){
    if(!fs.existsSync(path.join(resources,'ffmpeg-runtime','lib',path.basename(dep))))throw Error('Missing relative dependency: '+dep);
   }else if(dep.startsWith('@loader_path/')){
    if(!fs.existsSync(path.join(path.dirname(p),path.basename(dep))))throw Error('Missing loader dependency: '+dep);
   }else if(dep.startsWith('@')||dep.startsWith('/')&&!dep.startsWith('/usr/lib/')&&!dep.startsWith('/System/Library/')){
    throw Error('Unexpected linked dependency: '+dep);
   }
  }
  execFileSync('codesign',['--verify','--verbose=1',p],{encoding:'utf8',stdio:'pipe'});
  checked.push(rel);
 }
 for(const name of notices){
  const p=path.join(resources,'third-party-licenses',name);
  if(!fs.lstatSync(p).isFile()||sha(p)!==sha(path.join(repo,'release-audit','licenses',name)))throw Error('Missing or changed license: '+name);
 }
 const status=fs.readFileSync(path.join(resources,'STAGING-STATUS.txt'),'utf8');
 if(!status.includes('Architecture: '+arch+'\n')||!status.includes('redistribution NOT authorized'))throw Error('Missing internal-test restriction');
 const mainBinary=path.join(root,'Contents','MacOS','IInnovent Professional Storyboard');
 if(!fs.existsSync(mainBinary))throw Error('Missing Electron app executable');
 const mainArchs=execFileSync('lipo',['-archs',mainBinary],{encoding:'utf8'}).trim().split(/\s+/);
 if(!mainArchs.includes(expected))throw Error('Electron app architecture mismatch');
 console.log('RI2.15.5-C2.4 UNPACKED APP PASS',JSON.stringify({arch,app:root,checked,licenseCount:notices.length,distributionAuthorized:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==4)throw Error('Usage: node scripts/ri2-verify-unpacked-app.mjs <arm64|x64> <app-path>');inspect(process.argv[3],process.argv[2])}
 catch(e){console.error('RI2.15.5-C2.4 FAIL:',e.message);process.exitCode=1}
}
export {inspect};
