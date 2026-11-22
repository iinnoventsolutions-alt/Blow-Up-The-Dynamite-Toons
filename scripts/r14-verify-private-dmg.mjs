#!/usr/bin/env node
// R1.4-C: read-only inspection of an existing macOS DMG; never creates or publishes installers.
// Usage: node scripts/r14-verify-private-dmg.mjs <arm64|x64> <absolute-dmg-path>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {inspect} from './ri2-verify-unpacked-app.mjs';
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
  inspect(path.join(mount,apps[0]),arch); // Reuses approved hashes, architecture, linkage and notice checks.
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
