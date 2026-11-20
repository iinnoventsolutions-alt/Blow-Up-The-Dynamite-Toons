#!/usr/bin/env node
// RI2.15.5-C2.4-D3 — read-only two-stage macOS verification.
// Original B3 files must match staged inputs. Signed hashes are recorded as evidence only.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const approved=JSON.parse(fs.readFileSync(path.join(repo,'release-audit/ri2-15-5-b3-approved-hashes.json'),'utf8'));
const files=['bin/ffmpeg','lib/libvpx.12.dylib','lib/libopus.0.dylib'];
const licenses=['FFmpeg-n7.1.1-LICENSE.md','FFmpeg-n7.1.1-COPYING.LGPLv2.1','libvpx-v1.16.0-LICENSE','opus-v1.6.1-COPYING'];
const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const cmd=(name,args)=>execFileSync(name,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000});
function regularWithin(root,relative){
 const p=path.join(root,relative),base=fs.realpathSync(root),actual=fs.realpathSync(p);
 if(!actual.startsWith(base+path.sep))throw Error('Escaping path: '+relative);
 if(!fs.lstatSync(p).isFile())throw Error('Not a regular file: '+relative);
 return p;
}
function verify(arch,staging,app){
 if(process.platform!=='darwin')throw Error('macOS required');
 if(!['arm64','x64'].includes(arch))throw Error('Unsupported architecture');
 const machine=arch==='arm64'?'arm64':'x86_64';
 const stage=fs.realpathSync(staging),bundle=fs.realpathSync(app);
 if(!bundle.endsWith('.app'))throw Error('Expected .app directory');
 const resources=path.join(bundle,'Contents','Resources');
 const runtime=path.join(resources,'ffmpeg-runtime');
 const report={checkpoint:'RI2.15.5-C2.4-D3',architecture:arch,stagedB3Verified:true,postSigningHashesAreEvidenceOnly:true,distributionAuthorized:false,files:[]};
 for(const rel of files){
  const before=regularWithin(stage,'ffmpeg-runtime/'+rel);
  const after=regularWithin(runtime,rel);
  const beforeHash=digest(before),afterHash=digest(after);
  if(beforeHash!==approved[arch][rel])throw Error('B3 mismatch in staged '+rel);
  const actualArchs=cmd('lipo',['-archs',after]).trim().split(/\s+/);
  if(actualArchs.length!==1||actualArchs[0]!==machine)throw Error('Incorrect packaged architecture: '+rel);
  cmd('codesign',['--verify','--strict','--verbose=2',after]);
  const dependencies=cmd('otool',['-L',after]).split('\n').slice(1).map(s=>s.trim().split(' (')[0]).filter(Boolean);
  for(const dep of dependencies){
   if(dep.startsWith('/usr/lib/')||dep.startsWith('/System/Library/'))continue;
   if(dep.startsWith('@executable_path/../lib/')&&rel==='bin/ffmpeg'){
    regularWithin(runtime,'lib/'+path.basename(dep));continue;
   }
   if(dep.startsWith('@loader_path/')&&rel.startsWith('lib/')){
    regularWithin(runtime,'lib/'+path.basename(dep));continue;
   }
   throw Error('Unexpected dependency in '+rel+': '+dep);
  }
  report.files.push({path:rel,b3Sha256:beforeHash,packagedSha256:afterHash,signatureVerified:true,architecture:machine});
 }
 for(const name of licenses){
  const packaged=regularWithin(resources,'third-party-licenses/'+name);
  if(digest(packaged)!==digest(path.join(repo,'release-audit','licenses',name)))throw Error('License mismatch: '+name);
 }
 const status=fs.readFileSync(regularWithin(resources,'STAGING-STATUS.txt'),'utf8');
 if(!status.includes('Architecture: '+arch+'\n')||!status.includes('redistribution NOT authorized'))throw Error('Missing internal-only staging status');
 const exe=regularWithin(bundle,'Contents/MacOS/IInnovent Professional Storyboard');
 if(!cmd('lipo',['-archs',exe]).trim().split(/\s+/).includes(machine))throw Error('Wrong Electron executable architecture');
 cmd('codesign',['--verify','--deep','--strict','--verbose=2',bundle]);
 const ffmpeg=path.join(runtime,'bin/ffmpeg');
 const version=cmd(ffmpeg,['-hide_banner','-version']);
 if(!/^ffmpeg version /m.test(version))throw Error('FFmpeg execution did not report version');
 report.licenseCount=licenses.length;
 report.appSignatureVerified=true;
 report.ffmpegExecutionVerified=true;
 console.log('RI2.15.5-C2.4-D3 TWO-STAGE PASS');
 console.log(JSON.stringify(report,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==5)throw Error('Usage: node scripts/ri2-verify-signed-two-stage.mjs <arm64|x64> <C2.2-staging-root> <signed-unpacked-app>');verify(process.argv[2],process.argv[3],process.argv[4])}
 catch(e){console.error('RI2.15.5-C2.4-D3 FAIL:',e.message);process.exitCode=1}
}
export {verify};
