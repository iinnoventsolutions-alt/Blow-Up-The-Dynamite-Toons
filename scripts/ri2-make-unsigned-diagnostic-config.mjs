#!/usr/bin/env node
// RI2.15.5-C2.4-D2: produce unsigned, unpacked diagnostic config only.
// Source C2.3 configuration is left untouched. Never distribute the resulting app.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
function makeUnsigned(source,arch,target){
 if(!['arm64','x64'].includes(arch))throw Error('Expected arm64 or x64');
 if(fs.existsSync(target))throw Error('Output config already exists');
 const config=JSON.parse(fs.readFileSync(source,'utf8'));
 const output='release/ri2-c24-d2-unsigned-'+arch;
 if(!Array.isArray(config.extraResources)||config.extraResources.length!==3)throw Error('Expected verified C2.3 resources');
 if(!config.extraResources.some(x=>x.to==='ffmpeg-runtime')||!config.extraResources.some(x=>x.to==='third-party-licenses')||!config.extraResources.some(x=>x.to==='STAGING-STATUS.txt'))throw Error('Missing verified resources');
 if(!config.directories?.output?.endsWith('ri2-c23-'+arch))throw Error('Incorrect architecture-specific source config');
 config.directories.output=output;
 config.mac={...config.mac,identity:null,hardenedRuntime:false};
 fs.writeFileSync(target,JSON.stringify(config,null,2)+'\n',{flag:'wx'});
 return target;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==5)throw Error('Usage: node scripts/ri2-make-unsigned-diagnostic-config.mjs <arm64|x64> <C2.3-config.json> <new-output.json>');
  console.log('RI2.15.5-C2.4-D2 UNSIGNED CONFIG READY:',makeUnsigned(process.argv[3],process.argv[2],process.argv[4]));
 }catch(e){console.error('RI2.15.5-C2.4-D2 FAIL:',e.message);process.exitCode=1}
}
export {makeUnsigned};
