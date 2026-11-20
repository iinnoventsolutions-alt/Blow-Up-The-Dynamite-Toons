#!/usr/bin/env node
// Read-only B3 hash comparison for unsigned macOS diagnostic bundles.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(repo,'release-audit/ri2-15-5-b3-approved-hashes.json'),'utf8'));
const rels=['bin/ffmpeg','lib/libvpx.12.dylib','lib/libopus.0.dylib'];
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function compare(arch,app){
 if(!['arm64','x64'].includes(arch))throw Error('Invalid architecture');
 const root=fs.realpathSync(app);
 if(!root.endsWith('.app'))throw Error('Expected .app');
 let failed=false;
 for(const rel of rels){
  const p=path.join(root,'Contents','Resources','ffmpeg-runtime',rel);
  if(!fs.lstatSync(p).isFile())throw Error('Missing runtime file: '+rel);
  const actual=hash(p),expected=manifest[arch][rel],pass=actual===expected;
  console.log(arch,rel,pass?'B3 MATCH':'B3 MISMATCH','actual='+actual,'expected='+expected);
  if(!pass)failed=true;
 }
 if(failed)throw Error('One or more unsigned runtime files differ from B3');
 console.log('RI2.15.5-C2.4-D2 UNSIGNED B3 MATCH PASS:',arch);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==4)throw Error('Usage: node scripts/ri2-compare-unsigned-hashes.mjs <arm64|x64> <unpacked-app>');compare(process.argv[2],process.argv[3])}
 catch(e){console.error('RI2.15.5-C2.4-D2 FAIL:',e.message);process.exitCode=1}
}
export {compare};
