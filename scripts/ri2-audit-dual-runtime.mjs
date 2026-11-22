#!/usr/bin/env node
// RI2.15.5-B2: read-only, two-architecture private FFmpeg runtime audit on macOS.
// Usage: node scripts/ri2-audit-dual-runtime.mjs /absolute/ARM64/runtime /absolute/Intel/runtime [expected-hashes.json]
// expected-hashes.json shape: {"arm64":{"bin/ffmpeg":"sha256",...},"x86_64":{...}}
// No signing, packaging, installation, distribution or production approval.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const required=['bin/ffmpeg','lib/libvpx.12.dylib','lib/libopus.0.dylib'];
const [arm,intel,manifest]=process.argv.slice(2);
if (!arm || !intel || ![arm,intel].every(path.isAbsolute) || (manifest && !path.isAbsolute(manifest))) {
  console.error('Usage: node scripts/ri2-audit-dual-runtime.mjs /absolute/arm64/runtime /absolute/intel/runtime [/absolute/expected-hashes.json]');
  process.exit(2);
}
let expected=null;
try { if(manifest) expected=JSON.parse(fs.readFileSync(manifest,'utf8')); }
catch(e){console.error('Invalid expected-hashes manifest:',e.message);process.exit(2);}
const report={checkpoint:'RI2.15.5-B2',scope:'private relocated FFmpeg runtimes only',expectedHashComparison:!!expected,results:[],releaseAuthorized:false};
const command=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',timeout:15000,maxBuffer:1024*1024}).trim();
function audit(root,arch){
  const result={architecture:arch,root,files:[],errors:[],warnings:[]};
  const error=x=>result.errors.push(x);
  const files=new Set(required);
  try{
    if(!fs.realpathSync(root).startsWith('/')) throw Error('invalid root');
    for(const d of ['bin','lib']){
      const st=fs.lstatSync(path.join(root,d));
      if(!st.isDirectory()||st.isSymbolicLink()) error(d+' is not a regular directory');
    }
    for(const d of ['bin','lib']){
      for(const name of fs.readdirSync(path.join(root,d))){
        const rel=d+'/'+name;
        if(!files.has(rel)) error('unexpected file or directory: '+rel);
      }
    }
  }catch(e){error('runtime directory: '+e.message);}
  for(const rel of required){
    const full=path.join(root,rel);
    try{
      const st=fs.lstatSync(full);
      if(!st.isFile()||st.isSymbolicLink()||st.size===0) throw Error('not a nonempty regular file');
      const hash=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      const f={path:rel,size:st.size,sha256:hash};
      const architectures=command('lipo',['-archs',full]).split(/\s+/);
      f.architectures=architectures;
      if(architectures.length!==1||architectures[0]!==arch) error(rel+': unexpected architectures '+architectures.join(','));
      if(expected){
        const reference=expected?.[arch]?.[rel];
        if(!reference||!/^[a-f0-9]{64}$/i.test(reference)) error(rel+': expected hash missing or invalid');
        else if(hash.toLowerCase()!==reference.toLowerCase()) error(rel+': SHA-256 differs from approved manifest');
        else f.matchesApprovedHash=true;
      }
      const raw=command('otool',['-L',full]).split('\n').slice(1);
      f.dependencies=[];
      for(const line of raw){
        const dep=line.trim().split(/\s+\(/)[0];
        if(!dep)continue;
        f.dependencies.push(dep);
        if(dep.startsWith('/usr/lib/')||dep.startsWith('/System/Library/')) continue;
        // All non-system dependencies must be included in this exact runtime.
        let resolved;
        if(dep.startsWith('@executable_path/')) resolved=path.resolve(root,'bin',dep.slice('@executable_path/'.length));
        else if(dep.startsWith('@loader_path/')) resolved=path.resolve(path.dirname(full),dep.slice('@loader_path/'.length));
        else {error(rel+': unexpected external dependency '+dep);continue;}
        if(!resolved.startsWith(path.resolve(root)+path.sep)) {error(rel+': dependency escapes runtime '+dep);continue;}
        const target=path.relative(root,resolved).split(path.sep).join('/');
        if(!files.has(target)) error(rel+': unapproved bundled dependency '+dep);
        try{if(!fs.statSync(resolved).isFile())error(rel+': dependency not a file '+dep);}
        catch{error(rel+': missing dependency '+dep);}
      }
      try{command('codesign',['--verify','--verbose=2',full]);f.signatureVerification='PASS';}
      catch(e){f.signatureVerification='FAIL';error(rel+': codesign verification failed');}
      result.files.push(f);
    }catch(e){error(rel+': '+e.message);}
  }
  if(!expected)result.warnings.push('No approved hash manifest supplied; hashes computed but authenticity not established');
  result.status=result.errors.length?'FAIL':'PASS_WITH_SCOPE_LIMITS';
  return result;
}
report.results.push(audit(arm,'arm64'),audit(intel,'x86_64'));
report.status=report.results.some(x=>x.errors.length)?'FAIL':'RUNTIME_AUDIT_PASS_PACKAGE_RELEASE_OPEN';
console.log(JSON.stringify(report,null,2));
process.exitCode=report.status==='FAIL'?1:0;
