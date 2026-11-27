const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {resolveMp4Mov,probeMp4Mov} = require('../desktop/mp4-mov-runtime.cjs');
const {packagedEncoder} = require('../desktop/isolated-ffmpeg.cjs');
const {stageMp4Mov} = require('../scripts/mp4-mov-afterpack.cjs');
const options = {platform:'darwin',release:'24.0.0'};
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'mp4-mov-test-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const binary = path.join(root,'ffmpeg-mp4-mov-runtime','bin','ffmpeg');
  fs.mkdirSync(path.dirname(binary),{recursive:true});
  fs.writeFileSync(binary,'fixture',{mode:0o755});
  return {root,binary};
}
const responses = {'-version':'ffmpeg version 7.1.5 Copyright\n','-encoders':' V..... h264_videotoolbox H264\n A..... aac AAC\n','-muxers':' E  mp4 MP4\n E  mov MOV\n'};
const runner = overrides => async (_,args) => ({stdout:({...responses,...overrides})[args[1]]});
test('separate runtime resolves without WebM libraries',t=>{
  const {root,binary}=fixture(t);
  assert.equal(resolveMp4Mov(root,options),fs.realpathSync(binary));
});
test('reject unsupported OS and platform',t=>{
  const {root}=fixture(t);
  for(const o of [{platform:'linux',release:'24.0.0'},{platform:'darwin',release:'23.6.0'},{platform:'darwin',release:'invalid'}])
    assert.throws(()=>resolveMp4Mov(root,o),/macOS 15/);
});
test('reject relative path, missing binary and non-executable binary',t=>{
  const {root,binary}=fixture(t);
  assert.throws(()=>resolveMp4Mov('relative',options),/resources/);
  fs.chmodSync(binary,0o644);
  assert.throws(()=>resolveMp4Mov(root,options),/component/);
  fs.unlinkSync(binary);
  assert.throws(()=>resolveMp4Mov(root,options),/ENOENT/);
});
test('reject symlinked executable and directory',t=>{
  const {root,binary}=fixture(t);
  const outside=path.join(root,'other');
  fs.writeFileSync(outside,'fixture',{mode:0o755});
  fs.unlinkSync(binary); fs.symlinkSync(outside,binary);
  assert.throws(()=>resolveMp4Mov(root,options),/component/);
  const bin=path.dirname(binary);
  fs.renameSync(bin,bin+'-real'); fs.symlinkSync(bin+'-real',bin);
  assert.throws(()=>resolveMp4Mov(root,options),/component/);
});
test('probe fixed commands, bounded execution and supported formats',async t=>{
  const {root,binary}=fixture(t); const calls=[];
  const result=await probeMp4Mov(root,{...options,run:async (file,args,opts)=>{
    assert.equal(file,fs.realpathSync(binary)); assert.equal(opts.shell,false);
    assert.equal(opts.timeout,10000); assert.equal(opts.maxBuffer,65536);
    calls.push(args); return runner({})(file,args);
  }});
  assert.deepEqual(calls,Object.keys(responses).map(flag=>['-hide_banner',flag]));
  assert.deepEqual(result.formats,['mp4','mov']);
});
test('probe rejects incorrect version and missing exact capabilities',async t=>{
  const {root}=fixture(t);
  for(const overrides of [{'-version':'ffmpeg version 9.0.2'},{'-encoders':' V..... h264_videotoolbox H264\n A..... aac_at AAC\n'},{'-encoders':' A..... aac AAC\n'},{'-muxers':' E mp4 MP4\n'},{'-muxers':' E mov MOV\n'}])
    await assert.rejects(probeMp4Mov(root,{...options,run:runner(overrides)}),/version|capabilities/);
});
test('probe propagates failure and abort without executing further commands',async t=>{
  const {root}=fixture(t);
  await assert.rejects(probeMp4Mov(root,{...options,run:async()=>{throw new Error('timeout')}}),/timeout/);
  const controller=new AbortController(); let calls=0;
  await assert.rejects(probeMp4Mov(root,{...options,signal:controller.signal,run:async()=>{calls++;controller.abort();return {stdout:responses['-version']}}}),{name:'AbortError'});
  assert.equal(calls,1);
});
test('existing WebM resolver independent of missing new runtime',t=>{
  const {root}=fixture(t);
  fs.rmSync(path.join(root,'ffmpeg-mp4-mov-runtime'),{recursive:true});
  const webm=path.join(root,'ffmpeg-runtime');
  fs.mkdirSync(path.join(webm,'bin'),{recursive:true});fs.mkdirSync(path.join(webm,'lib'));
  fs.writeFileSync(path.join(webm,'bin','ffmpeg'),'webm',{mode:0o755});
  for(const name of ['libvpx.12.dylib','libopus.0.dylib'])fs.writeFileSync(path.join(webm,'lib',name),'fixture');
  assert.equal(packagedEncoder(root,'darwin'),fs.realpathSync(path.join(webm,'bin','ffmpeg')));
});
test('optional packaging is a no-op and rejects unsupported architecture',async t=>{
  const {root}=fixture(t);
  assert.equal(await stageMp4Mov(root,'arm64',{env:{}}),false);
  await assert.rejects(stageMp4Mov(root,'ia32',{env:{}}),/architecture/);
  await assert.rejects(stageMp4Mov(root,'arm64',{env:{V1124_MP4_MOV_ARM64_DIR:'relative'}}),/absolute/);
});
test('packaging rejects substituted binary before architecture inspection or writes',async t=>{
  const {root}=fixture(t);
  const source=path.join(root,'stage');fs.mkdirSync(path.join(source,'bin'),{recursive:true});
  fs.writeFileSync(path.join(source,'bin','ffmpeg'),'wrong');
  const resources=path.join(root,'resources');fs.mkdirSync(resources);
  for(const [arch,key] of [['arm64','V1124_MP4_MOV_ARM64_DIR'],['x64','V1124_MP4_MOV_X64_DIR']])
    await assert.rejects(stageMp4Mov(resources,arch,{env:{[key]:source},inspect:()=>assert.fail('unexpected inspection')}),/checksum/);
  assert.deepEqual(fs.readdirSync(resources),[]);
});
test('packaging rejects symlinked staging component',async t=>{
  const {root,binary}=fixture(t);
  const source=path.join(root,'stage');fs.mkdirSync(path.join(source,'bin'),{recursive:true});
  fs.symlinkSync(binary,path.join(source,'bin','ffmpeg'));
  await assert.rejects(stageMp4Mov(root,'x64',{env:{V1124_MP4_MOV_X64_DIR:source}}),/component/);
});
