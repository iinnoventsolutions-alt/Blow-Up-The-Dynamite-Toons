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

const {selectExportEncoder}=require('../desktop/isolated-export-encoder-router.cjs');
function webmFixture(root){
 const runtime=path.join(root,'ffmpeg-runtime');
 fs.mkdirSync(path.join(runtime,'bin'),{recursive:true});
 fs.mkdirSync(path.join(runtime,'lib'));
 const binary=path.join(runtime,'bin','ffmpeg');
 fs.writeFileSync(binary,'webm',{mode:0o755});
 for(const name of ['libvpx.12.dylib','libopus.0.dylib'])fs.writeFileSync(path.join(runtime,'lib',name),'fixture');
 return fs.realpathSync(binary);
}
test('D3.2 default and explicit WebM preserve existing resolver without MP4/MOV',async t=>{
 const {root}=fixture(t);
 fs.rmSync(path.join(root,'ffmpeg-mp4-mov-runtime'),{recursive:true});
 const binary=webmFixture(root);
 for(const format of [undefined,'webm']){
  const result=await selectExportEncoder(root,format,{...options,run:()=>assert.fail('unexpected probe')});
  assert.deepEqual(result,{format:'webm',binary});
  assert.ok(Object.isFrozen(result));
 }
});
test('D3.2 MP4 and MOV select only the separate validated runtime',async t=>{
 const {root,binary}=fixture(t);
 for(const format of ['mp4','mov']){
  const calls=[];
  const result=await selectExportEncoder(root,format,{...options,run:async(file,args)=>{
   assert.equal(file,fs.realpathSync(binary));calls.push(args[1]);return runner({})(file,args);
  }});
  assert.deepEqual(result,{format,binary:fs.realpathSync(binary)});
  assert.ok(Object.isFrozen(result));
  assert.deepEqual(calls,['-version','-encoders','-muxers']);
 }
});
test('D3.2 unsupported format rejected before runtime access',async()=>{
 for(const format of ['avi','MP4','',null,{},1])
  await assert.rejects(selectExportEncoder('relative',format,options),/Invalid export format/);
});
test('D3.2 missing or invalid MP4/MOV runtime never falls back to WebM',async t=>{
 const {root,binary}=fixture(t);webmFixture(root);
 await assert.rejects(selectExportEncoder(root,'mp4',{...options,run:runner({'-version':'ffmpeg version 9.0.2'})}),/version/);
 await assert.rejects(selectExportEncoder(root,'mov',{...options,run:runner({'-muxers':' E mp4 MP4'})}),/capabilities/);
 fs.unlinkSync(binary);
 await assert.rejects(selectExportEncoder(root,'mp4',{...options,run:()=>assert.fail('unexpected probe')}),/ENOENT/);
});
test('D3.2 missing WebM never falls back to MP4/MOV',async t=>{
 const {root}=fixture(t);
 await assert.rejects(selectExportEncoder(root,'webm',{...options,run:()=>assert.fail('unexpected probe')}),/ENOENT/);
});
test('D3.2 unsupported OS rejects MP4/MOV before probing',async t=>{
 const {root}=fixture(t);
 for(const o of [{platform:'linux',release:'24.0.0'},{platform:'darwin',release:'23.6.0'}])
  await assert.rejects(selectExportEncoder(root,'mov',{...o,run:()=>assert.fail('unexpected probe')}),/macOS 15/);
});
test('D3.2 abort propagates before and during routing',async t=>{
 const {root}=fixture(t);
 const before=new AbortController();before.abort();
 for(const format of ['webm','mp4','mov'])
  await assert.rejects(selectExportEncoder(root,format,{...options,signal:before.signal,run:()=>assert.fail('unexpected probe')}),{name:'AbortError'});
 const during=new AbortController();let calls=0;
 await assert.rejects(selectExportEncoder(root,'mp4',{...options,signal:during.signal,run:async()=>{calls++;during.abort();return {stdout:responses['-version']}}}),{name:'AbortError'});
 assert.equal(calls,1);
});

const {buildEncodingArgs}=require('../desktop/isolated-export-encoding-profile.cjs');
const profileInput={width:640,height:360,fps:24,hasAudio:true,audioFile:'/tmp/fixture/audio.f32',output:'/tmp/fixture/export.webm'};
const profileFor=(format,patch={})=>buildEncodingArgs({...profileInput,format,output:'/tmp/fixture/export.'+format,...patch});
const commonArgs=['-hide_banner','-loglevel','error','-nostdin','-y','-f','rawvideo','-pixel_format','rgba','-video_size','640x360','-framerate','24','-i','pipe:0'];
const audioArgs=['-f','f32le','-ar','48000','-ac','1','-i',profileInput.audioFile];
test('D3.3-A WebM profile preserves exact existing arguments with and without audio',()=>{
 for(const hasAudio of [true,false]){
  const expected=[...commonArgs,...(hasAudio?audioArgs:[]),'-map','0:v:0',...(hasAudio?['-map','1:a:0']:[]),'-c:v','libvpx','-pix_fmt','yuv420p','-auto-alt-ref','0','-b:v','1M',...(hasAudio?['-c:a','libopus']:['-an']),'-f','webm',profileInput.output];
  assert.deepEqual(buildEncodingArgs({...profileInput,hasAudio}),expected);
 }
});
for(const format of ['mp4','mov']){
 test('D3.3-A '+format+' low-resolution quality profile',()=>{
  const args=profileFor(format);
  assert.deepEqual(args,[...commonArgs,...audioArgs,'-map','0:v:0','-map','1:a:0','-c:v','h264_videotoolbox','-pix_fmt','yuv420p','-b:v','2500k','-c:a','aac','-b:a','128k','-movflags','+faststart','-f',format,'/tmp/fixture/export.'+format]);
  assert.ok(Object.isFrozen(args));
 });
}
test('D3.3-A MP4/MOV video-only profiles omit audio inputs and codecs',()=>{
 for(const format of ['mp4','mov'])
  assert.deepEqual(profileFor(format,{hasAudio:false,audioFile:undefined}),[...commonArgs,'-map','0:v:0','-c:v','h264_videotoolbox','-pix_fmt','yuv420p','-b:v','2500k','-an','-movflags','+faststart','-f',format,'/tmp/fixture/export.'+format]);
});
test('D3.3-A unsupported format rejected',()=>{
 for(const format of ['avi','MP4','',null,{},1])
  assert.throws(()=>buildEncodingArgs({...profileInput,format}),/Invalid export format/);
});
test('D3.3-A invalid dimensions, frame rate and audio availability rejected',()=>{
 for(const patch of [{width:1},{height:0},{width:2.5},{width:8192,height:8192},{fps:0},{fps:241},{fps:NaN},{hasAudio:'true'}])
  assert.throws(()=>profileFor('mp4',patch));
});
test('D3.3-A mismatched or unsafe paths rejected',()=>{
 for(const patch of [{output:'/tmp/export.mov'},{output:'relative.mp4'},{output:'/tmp/a\0.mp4'},{audioFile:'pipe:1'},{audioFile:'/tmp/a\0.f32'},{audioFile:'/tmp/fixture/export.mp4'}])
  assert.throws(()=>profileFor('mp4',patch),/Invalid .* path/);
});
test('D3.3-A odd dimensions rejected for MP4/MOV without changing WebM',()=>{
 for(const format of ['mp4','mov'])
  for(const patch of [{width:641},{height:361}])
   assert.throws(()=>profileFor(format,patch),/even dimensions/);
 assert.ok(profileFor('webm',{width:641}).includes('641x360'));
});

const {createIsolatedFfmpegSink}=require('../desktop/isolated-ffmpeg-sink.cjs');
const {createIsolatedExportPipeline}=require('../desktop/isolated-export-pipeline.cjs');
const {EventEmitter}=require('node:events');
function streamingFake(calls,{fail=false}={}){
 return (binary,args,opts)=>{
  const child=new EventEmitter();child.stdin=new EventEmitter();child.stderr=new EventEmitter();child.exitCode=null;
  const output=args.at(-1);const call={binary,args,opts,output,frames:[]};calls.push(call);
  child.stdin.write=(bytes,cb)=>queueMicrotask(()=>{call.frames.push(Buffer.from(bytes));cb()});
  child.stdin.end=()=>queueMicrotask(()=>{if(!fail)fs.writeFileSync(output,Buffer.from([1,2,3]));child.exitCode=fail?1:0;child.emit('close',child.exitCode)});
  child.kill=()=>{child.exitCode=1;queueMicrotask(()=>{child.stdin.emit('error',new Error('EPIPE'));child.emit('close',1)})};
  return child;
 };
}
for(const format of ['webm','mp4','mov']){
 test('D3.3-B '+format+' pipeline streams frames and cleans temporary output',async t=>{
  const {root,binary}=fixture(t);const expected=format==='webm'?webmFixture(root):fs.realpathSync(binary);
  const calls=[],progress=[],signal=new AbortController().signal;
  const pipeline=createIsolatedExportPipeline({resourcesPath:root,frameCount:2,
   sinkFactory:opts=>createIsolatedFfmpegSink({...opts,encoderOptions:{...options,run:runner({})},spawnProcess:streamingFake(calls)}),
   renderAudio:async()=>format==='mov'?null:{sampleRate:48000,samples:new Float32Array([0,.5])},
   renderFrame:async(_,index)=>({index,timestampUs:index*125000,pixels:new Uint8Array(16).fill(index)})});
  const output=await pipeline({width:2,height:2,fps:8,...(format==='webm'?{}:{format})},{signal,report:v=>progress.push(v)});
  assert.deepEqual([...output],[1,2,3]);assert.equal(calls.length,1);
  const call=calls[0];assert.equal(call.binary,expected);assert.equal(call.opts.shell,false);
  assert.equal(path.extname(call.output),'.'+format);
  assert.deepEqual(call.args,buildEncodingArgs({format,width:2,height:2,fps:8,hasAudio:format!=='mov',audioFile:path.join(path.dirname(call.output),'audio.f32'),output:call.output}));
  assert.deepEqual(call.frames.map(b=>[...b]),[Array(16).fill(0),Array(16).fill(1)]);
  assert.equal(progress.at(-1),1);assert.equal(fs.existsSync(path.dirname(call.output)),false);
 });
}
test('D3.3-B failure and cancellation clean temporary files',async t=>{
 const {root}=fixture(t);
 for(const cancel of [false,true]){
  const controller=new AbortController(),calls=[];
  const sink=await createIsolatedFfmpegSink({resourcesPath:root,width:2,height:2,fps:8,format:'mp4',signal:controller.signal,encoderOptions:{...options,run:runner({})},spawnProcess:streamingFake(calls,{fail:true})});
  try{
   await sink.writeAudio(null,controller.signal);
   await sink.writeFrame({index:0,pixels:new Uint8Array(16)},controller.signal);
   if(cancel)controller.abort();
   await assert.rejects(sink.finish(controller.signal),/abort|FFmpeg export failed/i);
  }finally{await sink.dispose();await sink.dispose()}
  assert.equal(fs.existsSync(path.dirname(calls[0].output)),false);
 }
});
test('D3.3-B rejects invalid format, odd dimensions and missing runtime before spawning',async t=>{
 const {root,binary}=fixture(t);webmFixture(root);fs.unlinkSync(binary);
 const opts={resourcesPath:root,width:2,height:2,fps:8,encoderOptions:{...options,run:runner({})},spawnProcess:()=>assert.fail('unexpected spawn')};
 await assert.rejects(createIsolatedFfmpegSink({...opts,format:'avi'}),/format/);
 await assert.rejects(createIsolatedFfmpegSink({...opts,format:'mov',width:3}),/even dimensions/);
 await assert.rejects(createIsolatedFfmpegSink({...opts,format:'mp4'}),/ENOENT/);
});

test('D3.3-D2 approved bitrate targets and orientation-independent boundaries',()=>{
 for(const format of ['mp4','mov']){
  for(const [width,height,target] of [[640,360,'2500k'],[854,480,'2500k'],[480,854,'2500k'],[856,480,'5000k'],[1280,720,'5000k'],[720,1280,'5000k'],[1282,720,'10000k'],[1920,1080,'10000k'],[1080,1920,'10000k'],[2560,1440,'10000k']]){
   for(const hasAudio of [true,false]){
    const args=profileFor(format,{width,height,hasAudio});
    assert.equal(args[args.indexOf('-b:v')+1],target);
    if(hasAudio)assert.equal(args[args.indexOf('-b:a')+1],'128k');
    else assert.ok(args.includes('-an'));
   }
  }
 }
});
test('D3.3-D2 WebM bitrate remains unchanged at every resolution',()=>{
 for(const [width,height] of [[854,480],[1280,720],[1920,1080],[1080,1920]]){
  const args=profileFor('webm',{width,height});
  assert.equal(args[args.indexOf('-b:v')+1],'1M');
  assert.equal(args[args.indexOf('-c:a')+1],'libopus');
 }
});

test('D3.3-D3.2-B stereo transport enforces sequential bounded chunks',async()=>{
 const {createStereoChunkTransport}=require('../desktop/isolated-stereo-chunk-transport.cjs');
 const calls=[];
 const transport=createStereoChunkTransport(async(kind,data)=>{
  calls.push(kind);
  if(kind==='stereo-begin')return {sampleRate:48000,channels:2,totalFrames:data.totalFrames};
  const frameCount=Math.min(48000,48001-data.startFrame);
  return {sampleRate:48000,channels:2,startFrame:data.startFrame,frameCount,samples:new Float32Array(frameCount*2)};
 });
 await transport.begin(48001);
 await assert.rejects(transport.read(48000),/sequence/);
 assert.equal((await transport.read(0)).samples.byteLength,384000);
 assert.equal((await transport.read(48000)).samples.length,2);
 await assert.rejects(transport.read(48001),/sequence/);
 assert.deepEqual(calls,['stereo-begin','stereo-chunk','stereo-chunk']);
});
test('D3.3-D3.2-B malformed stereo responses fail closed',async()=>{
 const {createStereoChunkTransport}=require('../desktop/isolated-stereo-chunk-transport.cjs');
 for(const patch of [{channels:1},{sampleRate:44100},{startFrame:1},{frameCount:2},{samples:new Float32Array(4)},{samples:new Float32Array([NaN,0])}]){
  const t=createStereoChunkTransport(async kind=>kind==='stereo-begin'?{sampleRate:48000,channels:2,totalFrames:1}:{sampleRate:48000,channels:2,startFrame:0,frameCount:1,samples:new Float32Array(2),...patch});
  await t.begin(1);await assert.rejects(t.read(0),/Invalid stereo/);await assert.rejects(t.read(0),/unavailable/);
 }
 const t=createStereoChunkTransport(async()=>null);
 assert.equal(await t.begin(1),null);await assert.rejects(t.read(0),/sequence/);
});
test('D3.3-D3.2-B concurrent requests and cancellation rejected',async()=>{
 const {createStereoChunkTransport}=require('../desktop/isolated-stereo-chunk-transport.cjs');
 let release;
 const t=createStereoChunkTransport(()=>new Promise(resolve=>{release=resolve}));
 const controller=new AbortController();
 const pending=t.begin(1,controller.signal);
 await assert.rejects(t.begin(1),/unavailable/);
 controller.abort();release({sampleRate:48000,channels:2,totalFrames:1});
 await assert.rejects(pending,{name:'AbortError'});
});

test('D3.3-D3.2-C stages ordered stereo bytes and disposes temporary file',async()=>{
 const {stageStereoAudio}=require('../desktop/isolated-stereo-audio-staging.cjs');
 let closed=false;const offsets=[];
 const transport={begin:async totalFrames=>({sampleRate:48000,channels:2,totalFrames}),read:async startFrame=>{
  offsets.push(startFrame);const frameCount=Math.min(48000,48001-startFrame),samples=new Float32Array(frameCount*2);samples[0]=.5;samples[1]=-.25;
  return {sampleRate:48000,channels:2,startFrame,frameCount,samples};
 },close(){closed=true}};
 const staged=await stageStereoAudio({transport,totalFrames:48001});
 try{
  assert.deepEqual(offsets,[0,48000]);assert.equal(closed,true);
  const bytes=fs.readFileSync(staged.audioFile);
  assert.equal(bytes.length,48001*8);assert.equal(bytes.readFloatLE(0),.5);assert.equal(bytes.readFloatLE(4),-.25);assert.equal(bytes.readFloatLE(384000),.5);
 }finally{await staged.dispose()}
 assert.equal(fs.existsSync(staged.audioFile),false);await staged.dispose();
});
test('D3.3-D3.2-C rejects incomplete staging, cancellation and disk budget',async()=>{
 const {stageStereoAudio}=require('../desktop/isolated-stereo-audio-staging.cjs');
 const before=new Set(fs.readdirSync(os.tmpdir()).filter(n=>n.startsWith('rfdr-stereo-')));
 for(const abort of [false,true]){
  const controller=new AbortController();let closed=false;
  const transport={begin:async totalFrames=>({sampleRate:48000,channels:2,totalFrames}),read:async startFrame=>{
   if(abort)controller.abort();
   return {sampleRate:48000,channels:2,startFrame,frameCount:1,samples:new Float32Array(0)};
  },close(){closed=true}};
  await assert.rejects(stageStereoAudio({transport,totalFrames:1,signal:controller.signal}),abort?{name:'AbortError'}:/Invalid stereo/);
  assert.equal(closed,true);
 }
 assert.deepEqual(fs.readdirSync(os.tmpdir()).filter(n=>n.startsWith('rfdr-stereo-')&&!before.has(n)),[]);
 await assert.rejects(stageStereoAudio({transport:{begin(){},read(){},close(){}},totalFrames:28800000,maxRawBytes:128*1024*1024}),/budget/);
});
test('D3.3-D3.2-C authenticated IPC rejects foreign sender, frame and token; fresh broker recovers',async()=>{
 const {EventEmitter}=require('node:events');
 const {createIsolatedBrowserIpc,REPLY_CHANNEL}=require('../desktop/isolated-browser-ipc.cjs');
 const ipcMain=new EventEmitter(),pageURL='file:///test/index.html',mainFrame={url:pageURL};
 let sent;const webContents={mainFrame,send:(_,message)=>{sent=message}},window={webContents};
 const trusted={sender:webContents,senderFrame:mainFrame};
 const make=()=>createIsolatedBrowserIpc({ipcMain,window,pageURL,windowIsUsable:()=>true,enabled:true,enableStereo:true,audioTimeoutMs:1000});
 const first=make(),controller=new AbortController();
 const pending=first.stereo.begin(1,controller.signal);
 const reply={token:sent.token,kind:sent.kind,data:{sampleRate:48000,channels:2,totalFrames:1}};
 ipcMain.emit(REPLY_CHANNEL,{...trusted,sender:{}},reply);
 ipcMain.emit(REPLY_CHANNEL,{...trusted,senderFrame:{url:pageURL}},reply);
 ipcMain.emit(REPLY_CHANNEL,trusted,{...reply,token:'wrong'});
 controller.abort();await assert.rejects(pending,{name:'AbortError'});first.close();
 const second=make();
 try{
  const next=second.stereo.begin(1);
  ipcMain.emit(REPLY_CHANNEL,trusted,reply);
  ipcMain.emit(REPLY_CHANNEL,trusted,{...reply,token:sent.token});
  assert.equal((await next).totalFrames,1);
  const chunk=second.stereo.read(0);
  ipcMain.emit(REPLY_CHANNEL,trusted,{token:sent.token,kind:sent.kind,data:{sampleRate:48000,channels:2,startFrame:0,frameCount:1,samples:new Float32Array([.5,-.5])}});
  assert.deepEqual([...(await chunk).samples],[.5,-.5]);
 }finally{second.close()}
 assert.equal(ipcMain.listenerCount(REPLY_CHANNEL),0);
});

for(const format of ['mp4','mov']){
 test('D3.3-D3.3 '+format+' stereo pipeline stages distinct channels and requests AAC 320k',async t=>{
  const {root}=fixture(t),calls=[];let audioPath,closed=false;
  const pipeline=createIsolatedExportPipeline({resourcesPath:root,frameCount:2,
   sinkFactory:opts=>createIsolatedFfmpegSink({...opts,encoderOptions:{...options,run:runner({})},spawnProcess:(binary,args,opts)=>{
    audioPath=args[args.indexOf('-ac')+3];
    assert.equal(args[args.indexOf('-ac')+1],'2');assert.equal(args[args.indexOf('-ar')+1],'48000');
    assert.equal(args[args.indexOf('-b:a')+1],'320k');assert.equal(args[args.indexOf('-c:a')+1],'aac');
    const pcm=fs.readFileSync(audioPath);assert.equal(pcm.length,12000*8);assert.equal(pcm.readFloatLE(0),.5);assert.equal(pcm.readFloatLE(4),-.25);
    return streamingFake(calls)(binary,args,opts);
   }}),
   createStereoTransport:async()=>({begin:async totalFrames=>({sampleRate:48000,channels:2,totalFrames}),read:async startFrame=>{
    const samples=new Float32Array(24000);samples[0]=.5;samples[1]=-.25;
    return {sampleRate:48000,channels:2,startFrame,frameCount:12000,samples};
   },close(){closed=true}}),
   renderAudio:async()=>assert.fail('legacy audio called'),
   renderFrame:async(_,index)=>({index,timestampUs:index*125000,pixels:new Uint8Array(16)})});
  assert.deepEqual([...(await pipeline({format,width:2,height:2,fps:8},{signal:new AbortController().signal,report(){}}))],[1,2,3]);
  assert.equal(closed,true);assert.equal(fs.existsSync(audioPath),false);
 });
}
test('D3.3-D3.3 stereo option cannot change WebM profile',()=>{
 assert.throws(()=>profileFor('webm',{audioChannels:2}),/channels/);
 for(const format of ['mp4','mov']){
  const args=profileFor(format,{audioChannels:2,hasAudio:false});
  assert.ok(args.includes('-an'));assert.ok(!args.includes('-ac'));assert.ok(!args.includes('-b:a'));
 }
});

test('D6-B capability policy defaults off and rejects renderer opt-in',async()=>{
 const {createExportFormatPolicy}=require('../desktop/isolated-export-format-policy.cjs');
 const policy=await createExportFormatPolicy({probe:()=>assert.fail('unexpected probe')});
 const request={projectId:'p',width:854,height:480,fps:24,outputName:'p.webm'};
 assert.deepEqual(policy.capabilities,{webm:true,mp4:false,mov:false});
 assert.deepEqual(policy.validate(request),request);
 assert.throws(()=>policy.validate({...request,format:'mp4',outputName:'p.mp4'}),/unavailable/);
 assert.throws(()=>policy.validate({...request,allowMp4Mov:true}),/fields/);
});
test('D6-B capability policy requires trusted opt-in and complete probe',async()=>{
 const {createExportFormatPolicy}=require('../desktop/isolated-export-format-policy.cjs');
 const good=async()=>({version:'7.1.5',formats:['mp4','mov']});
 const policy=await createExportFormatPolicy({enableMp4Mov:true,probe:good});
 assert.deepEqual(policy.capabilities,{webm:true,mp4:true,mov:true});
 assert.ok(Object.isFrozen(policy.capabilities));
 for(const format of ['mp4','mov'])assert.equal(policy.validate({projectId:'p',width:854,height:480,fps:24,format,outputName:'p.'+format}).format,format);
 for(const probe of [async()=>{throw Error('missing')},async()=>({version:'7.1.5',formats:['mp4']}),async()=>({version:'9',formats:['mp4','mov']})]){
  const denied=await createExportFormatPolicy({enableMp4Mov:true,probe});
  assert.deepEqual(denied.capabilities,{webm:true,mp4:false,mov:false});
 }
 const controller=new AbortController();
 await assert.rejects(createExportFormatPolicy({enableMp4Mov:true,signal:controller.signal,probe:async()=>{controller.abort();return good()}}),{name:'AbortError'});
});
test('D6-B session and backend boundaries deny by default and accept trusted policy',async()=>{
 const {createExportFormatPolicy}=require('../desktop/isolated-export-format-policy.cjs');
 const {createIsolatedExportSessions}=require('../desktop/isolated-export-sessions.cjs');
 const {createTrustedExportBackend}=require('../desktop/isolated-export-backend.cjs');
 const request={projectId:'p',width:854,height:480,fps:24,format:'mp4',outputName:'p.mp4'};
 const owner={};
 const policy=await createExportFormatPolicy({enableMp4Mov:true,probe:async()=>({version:'7.1.5',formats:['mp4','mov']})});
 assert.throws(()=>createIsolatedExportSessions({startExport:async()=>{}}).start(owner,request),/unavailable/);
 const session=createIsolatedExportSessions({formatPolicy:policy,startExport:async input=>input.format}).start(owner,request);
 assert.equal(await session.done,'mp4');
 let resolved=0;
 const deps={resolveProject:async()=>{resolved++;return null},renderFrame:async()=>{},renderAudio:async()=>{}};
 const context={signal:new AbortController().signal,report:()=>{}};
 await assert.rejects(createTrustedExportBackend(deps)(request,context),/unavailable/);
 assert.equal(resolved,0);
 await assert.rejects(createTrustedExportBackend({...deps,formatPolicy:policy})(request,context),/Trusted project unavailable/);
 assert.equal(resolved,1);
});
