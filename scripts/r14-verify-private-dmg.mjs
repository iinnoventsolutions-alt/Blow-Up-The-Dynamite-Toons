#!/usr/bin/env node
// R1.4-C: read-only inspection of an existing macOS DMG; never creates or publishes installers.
// Usage: node scripts/r14-verify-private-dmg.mjs <arm64|x64> <absolute-dmg-path>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const approved=JSON.parse(fs.readFileSync(path.join(repo,'release-audit/ri2-15-5-b3-approved-hashes.json'),'utf8'));
const components=['bin/ffmpeg','lib/libvpx.12.dylib','lib/libopus.0.dylib'];
const notices=['FFmpeg-n7.1.1-LICENSE.md','FFmpeg-n7.1.1-COPYING.LGPLv2.1','libvpx-v1.16.0-LICENSE','opus-v1.6.1-COPYING'];
function inspectApp(app,arch){
 const resources=path.join(app,'Contents','Resources');
 const expected=arch==='arm64'?'arm64':'x86_64';
 const binary=path.join(app,'Contents','MacOS','IInnovent Professional Storyboard');
 if(!run('lipo',['-archs',binary]).split(/\s+/).includes(expected))throw Error('App architecture mismatch');
 for(const rel of components){
  const p=path.join(resources,'ffmpeg-runtime',rel),st=fs.lstatSync(p);
  if(!st.isFile()||st.isSymbolicLink())throw Error('Invalid runtime file: '+rel);
  const hash=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  if(hash!==approved[arch][rel])throw Error('Runtime hash mismatch: '+rel);
  if(run('lipo',['-archs',p])!==expected)throw Error('Runtime architecture mismatch: '+rel);
  const links=run('otool',['-L',p]);
  if(links.includes('/opt/homebrew/') || links.includes('/usr/local/'))throw Error('Host-specific dependency: '+rel);
  for(const line of links.split('\n').slice(1)){
   const dep=line.trim().split(' (')[0];if(!dep)continue;
   if(dep.startsWith('@executable_path/../lib/')){if(!fs.existsSync(path.join(resources,'ffmpeg-runtime','lib',path.basename(dep))))throw Error('Missing linked library: '+dep);}
   else if(dep.startsWith('@loader_path/')){if(!fs.existsSync(path.join(path.dirname(p),path.basename(dep))))throw Error('Missing loader library: '+dep);}
   else if(dep.startsWith('@')||dep.startsWith('/')&&!dep.startsWith('/usr/lib/')&&!dep.startsWith('/System/Library/'))throw Error('Unexpected dependency: '+dep);
  }
  run('codesign',['--verify',p]);
 }
 for(const name of notices){
  const packaged=path.join(resources,'third-party-licenses',name),reference=path.join(repo,'release-audit/licenses',name);
  if(!fs.existsSync(packaged))throw Error('Missing packaged license notice: '+name);
  const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  if(sha(packaged)!==sha(reference))throw Error('Changed packaged license notice: '+name);
 }
 run('codesign',['--verify','--deep',app]);
}

const [arch,dmg]=process.argv.slice(2);
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const fail=(message)=>{console.error('R1.4-C FAIL:',message);process.exitCode=1;};
if(!['arm64','x64'].includes(arch)||!dmg||!path.isAbsolute(dmg)){
 fail('Usage: node scripts/r14-verify-private-dmg.mjs <arm64|x64> <absolute-dmg-path>');
}else if(process.platform!=='darwin'){fail('macOS is required for DMG inspection');}
else {
 let mount=null;
 try {
  const st=fs.lstatSync(dmg);
  if(!st.isFile()||st.isSymbolicLink()||!st.size)throw Error('DMG must be a nonempty regular file');
  const hash=crypto.createHash('sha256').update(fs.readFileSync(dmg)).digest('hex');
  // Private temporary mountpoint; hdiutil is read-only and must not auto-open Finder.
  mount=fs.mkdtempSync(path.join(os.tmpdir(),'r14-dmg-'));
  run('hdiutil',['attach','-readonly','-nobrowse','-noautoopen','-mountpoint',mount,dmg]);
  const apps=fs.readdirSync(mount).filter(n=>n.endsWith('.app'));
  if(apps.length!==1)throw Error('Expected exactly one .app in DMG, found '+apps.length);
  inspectApp(path.join(mount,apps[0]),arch); // Checks approved hashes, architecture, linkage and package notices.
  console.log('R1.4-C DMG PASS',JSON.stringify({arch,dmg,bytes:st.size,sha256:hash,app:apps[0],scope:'static inspection only',distributionAuthorized:false}));
 }catch(e){fail(e.message);}
 finally{
  if(mount){
   try{run('hdiutil',['detach',mount]);}
   catch(e){fail('Could not detach mounted DMG; manually inspect '+mount+': '+e.message);}
   try{fs.rmdirSync(mount);}catch{}
  }
 }
}
