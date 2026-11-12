import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const root='diagnostic-output/n3-8';
await mkdir(root,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4398','--strictPort'],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4398')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert(ready,'Vite server failed');
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:4398');
 const result=await page.evaluate(async()=>{
  const {renderIsolatedProjectFrame}=await import('/src/deterministic-artwork-renderer.ts');
  const {mixDeterministicAudio}=await import('/src/deterministic-audio-mixer.ts');
  const make=(id,color)=>({id,name:id,duration:4,dialogue:'',action:'',slugging:'',notes:'',layers:[{id:'l'+id,name:'l',visible:true,locked:false,opacity:1,strokes:[{id:'s'+id,tool:'shape',shape:'rectangle',color,size:1,fill:color,points:[[0,0,1],[64,64,1]]}]}]});
  const project={format:'innovent-storyboard',schemaVersion:5,id:'n38',title:'N3.8',subtitle:'',width:64,height:64,fps:8,
   scenes:[{id:'scene',name:'Scene',camera:[],panels:[make('a','#ff0000'),make('b','#0000ff')]}],
   transitions:[{id:'d',fromId:'a',toId:'b',type:'dissolve',duration:3,direction:'right'}],audioAssets:[],audioTracks:[]};
  const frames=[];
  for(let i=0;i<8;i++){const f=await renderIsolatedProjectFrame(project,i,{width:64});frames.push({timestampUs:f.timestampUs,rgba:Array.from(f.pixels)});}
  const src=new Float32Array(48000);for(let i=0;i<src.length;i++)src[i]=0.25*Math.sin(2*Math.PI*440*i/48000);
  const mixed=mixDeterministicAudio({durationSeconds:1,clips:[{startSeconds:.25,trimStartSeconds:0,durationSeconds:.5,sourceSamples:src}]});
  return {frames,audio:Array.from(mixed.samples)};
 });
 assert.equal(result.frames.length,8);
 assert.equal(result.audio.length,48000);
 assert.deepEqual(result.frames.map(f=>f.timestampUs),[0,125000,250000,375000,500000,625000,750000,875000]);
 const raw=Buffer.concat(result.frames.map(f=>Buffer.from(f.rgba)));
 const rawPath=root+'/frames.rgba',video=root+'/artwork.webm';
 await writeFile(rawPath,raw);
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size','64x64','-framerate','8','-i',rawPath,'-an','-vf','format=yuv420p','-c:v','libvpx','-b:v','400k','-deadline','good','-cpu-used','2','-f','webm',video]);
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',video],{encoding:'utf8'}));
 const stream=probe.streams.find(s=>s.codec_type==='video');
 assert.equal(stream.codec_name,'vp8');
 assert.equal(Number(stream.nb_read_frames),8);
 assert.equal(probe.streams.length,1);
 assert(Math.abs(Number(probe.format.duration)-1)<.02);
 const pts=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',video],{encoding:'utf8'}).trim().split(/\s+/).map(Number);
 assert.equal(pts.length,8);
 assert(pts.every((x,i)=>Math.abs(x-i/8)<.002));
 const decoded=execFileSync('ffmpeg',['-v','error','-i',video,'-f','rawvideo','-pix_fmt','rgb24','-']);
 assert.equal(decoded.length,8*64*64*3);
 const center=i=>[...decoded.subarray((i*64*64+32*64+32)*3,(i*64*64+32*64+32)*3+3)];
 const first=center(0),last=center(7),mid=center(2);
 assert(first[0]>first[2]+100,'First artwork frame is red');
 assert(last[2]>last[0]+100,'Last artwork frame is blue');
 assert(mid[0]>10&&mid[2]>10,'Transition blends red and blue');
 const report={status:'PASS',frames:8,fps:8,duration:Number(probe.format.duration),codec:stream.codec_name,pts,first,mid,last,bytes:(await readFile(video)).length};
 await writeFile(root+'/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));

 // N3.9: use the accepted N3.3 mixer output, not a synthetic FFmpeg tone source.
 const audioPath=root+'/mixed.f32',muxed=root+'/artwork-audio.webm';
 const pcm=Buffer.alloc(result.audio.length*4);
 result.audio.forEach((v,i)=>pcm.writeFloatLE(v,i*4));
 await writeFile(audioPath,pcm);
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',video,'-f','f32le','-ar','48000','-ac','1','-i',audioPath,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','libopus','-b:a','64k','-t','1','-f','webm',muxed]);
 const avProbe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',muxed],{encoding:'utf8'}));
 assert.deepEqual(new Set(avProbe.streams.map(s=>s.codec_name)),new Set(['vp8','opus']));
 assert.equal(Number(avProbe.streams.find(s=>s.codec_type==='video').nb_read_frames),8);
 assert(Math.abs(Number(avProbe.format.duration)-1)<.05);
 const decodedAudio=execFileSync('ffmpeg',['-v','error','-i',muxed,'-map','0:a:0','-ar','48000','-ac','1','-f','f32le','-']);
 const samples=decodedAudio.length/4;
 assert.equal(samples,48000,'Opus output must decode to exactly one second');
 const rms=(start,end)=>{let sum=0;for(let i=start;i<end;i++){const v=decodedAudio.readFloatLE(i*4);sum+=v*v;}return Math.sqrt(sum/(end-start));};
 const before=rms(0,9600),during=rms(18000,30000),after=rms(42000,48000);
 assert(before<.005&&during>.08&&after<.005,'Audio clip must remain aligned at 0.25–0.75 seconds');
 // N3.9.1: isolate packet-header diagnostics from successful sample-count assertions.
 const packetProbe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_packets','-show_entries','packet=pts_time,duration_time,size,flags','-of','json',muxed],{encoding:'utf8'}));
 const packetRows=packetProbe.packets??[];
 const packetPTS=packetRows.map(p=>Number(p.pts_time));
 const monotonic=packetPTS.every((v,i)=>Number.isFinite(v)&&(i===0||v>=packetPTS[i-1]));
 const {spawnSync}=await import('node:child_process');
 const decodeCheck=spawnSync('ffmpeg',['-hide_banner','-v','warning','-i',muxed,'-map','0:a:0','-f','null','-'],{encoding:'utf8'});
 const warningLines=(decodeCheck.stderr??'').split('\\n').filter(line=>/opus|error|invalid|corrupt/i.test(line));
 const packetReport={packetCount:packetRows.length,monotonic,firstPTS:packetPTS[0],lastPTS:packetPTS.at(-1),minPacketSize:Math.min(...packetRows.map(p=>Number(p.size))),decodeExit:decodeCheck.status,warnings:warningLines};
 await writeFile(root+'/opus-packet-diagnostics.json',JSON.stringify(packetReport,null,2));
 console.log('N3.9.1 packet diagnostics',JSON.stringify(packetReport));
 assert(packetRows.length>0&&monotonic&&decodeCheck.status===0,'Opus packet timestamps and decoder must be valid');
 // N3.9.2: isolate encoder output from WebM muxing, retaining exact PCM input.
 const standalone=root+'/standalone.opus';
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','f32le','-ar','48000','-ac','1','-i',audioPath,'-c:a','libopus','-b:a','64k','-f','opus',standalone]);
 const inspect=(file)=>{
  const decoded=spawnSync('ffmpeg',['-hide_banner','-v','warning','-i',file,'-map','0:a:0','-f','null','-'],{encoding:'utf8'});
  const packets=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_packets','-show_entries','packet=pts_time,duration_time,size,flags','-of','json',file],{encoding:'utf8'})).packets??[];
  const warnings=(decoded.stderr??'').split('\\n').filter(x=>/opus|error|invalid|corrupt/i.test(x));
  return {exit:decoded.status,packetCount:packets.length,firstPTS:packets[0]?.pts_time,lastPTS:packets.at(-1)?.pts_time,packetSizes:packets.map(p=>Number(p.size)),warnings};
 };
 const standaloneEvidence=inspect(standalone),webmEvidence=inspect(muxed);
 const rootCause={standalone:standaloneEvidence,webm:webmEvidence,encoderWarning:standaloneEvidence.warnings.some(x=>/Error parsing Opus packet header/.test(x)),webmWarning:webmEvidence.warnings.some(x=>/Error parsing Opus packet header/.test(x))};
 await writeFile(root+'/opus-root-cause.json',JSON.stringify(rootCause,null,2));
 console.log('N3.9.2 root cause',JSON.stringify({...rootCause,standalone:{...standaloneEvidence,packetSizes:undefined},webm:{...webmEvidence,packetSizes:undefined}}));
 assert.equal(standaloneEvidence.exit,0);
 assert.equal(webmEvidence.exit,0);
 assert(standaloneEvidence.packetCount>0&&webmEvidence.packetCount>0);
 // N3.9.3: compare demuxed Opus packet payload hashes, including any discard-padding packet.
 const crypto=await import('node:crypto');
 const packetPayloads=(file)=>{
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_packets','-show_data','-show_entries','packet=pts_time,duration_time,size,flags,data,side_data_list','-of','json',file],{encoding:'utf8'}));
  return (probe.packets??[]).map(p=>{
   const bytes=Buffer.from((p.data??'').split('\\n').map(line=>line.replace(/^[0-9a-f]+:\\s*/i,'').split('  ')[0].replace(/[^0-9a-f]/gi,'')).join(''),'hex');
   return {size:Number(p.size),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),sideData:p.side_data_list??[]};
  });
 };
 const originalPackets=packetPayloads(standalone),muxedPackets=packetPayloads(muxed);
 const mismatches=originalPackets.map((p,i)=>i).filter(i=>originalPackets[i].sha256!==muxedPackets[i]?.sha256);
 const remuxed=root+'/remuxed.webm';
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',standalone,'-c:a','copy','-f','webm',remuxed]);
 const remuxCheck=inspect(remuxed);
 const packetComparison={standaloneCount:originalPackets.length,muxedCount:muxedPackets.length,mismatches,standaloneSizes:originalPackets.map(p=>p.size),muxedSizes:muxedPackets.map(p=>p.size),standaloneSideData:originalPackets.filter(p=>p.sideData.length).map((p,i)=>({index:i,data:p.sideData})),muxedSideData:muxedPackets.filter(p=>p.sideData.length).map((p,i)=>({index:i,data:p.sideData})),remux:{exit:remuxCheck.exit,packetCount:remuxCheck.packetCount,warnings:remuxCheck.warnings}};
 await writeFile(root+'/opus-payload-comparison.json',JSON.stringify(packetComparison,null,2));
 console.log('N3.9.3 payload comparison',JSON.stringify({standaloneCount:packetComparison.standaloneCount,muxedCount:packetComparison.muxedCount,mismatches,remux:packetComparison.remux}));
 assert.equal(remuxCheck.exit,0);
 assert.equal(originalPackets.length,muxedPackets.length);
 // N3.9.4: independent libopus decoder (opusdec) and WebM codec delay/discard metadata.
 const meta=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_streams','-show_packets','-show_entries','stream=codec_name,sample_rate,start_time,time_base,initial_padding,extradata_size:packet=pts_time,duration_time,side_data_list','-of','json',muxed],{encoding:'utf8'}));
 const audioStream=meta.streams?.[0];
 const padding=meta.packets?.flatMap((p,i)=>(p.side_data_list??[]).map(s=>({packet:i,...s})))??[];
 // Demux WebM to Ogg Opus; compare independent opusdec output to the source Ogg Opus.
 const demuxed=root+'/webm-demuxed.opus';
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',muxed,'-map','0:a:0','-c:a','copy','-f','opus',demuxed]);
 const decodeOpus=(file,out)=>{
  const result=spawnSync('opusdec',['--quiet','--rate','48000','--force-wav',file,out],{encoding:'utf8'});
  return {exit:result.status,stderr:(result.stderr??'').slice(0,1000),error:result.error?.message};
 };
 const independentOriginal=decodeOpus(standalone,root+'/standalone-decoded.wav');
 const independentDemuxed=decodeOpus(demuxed,root+'/demuxed-decoded.wav');
 const compatibility={stream:audioStream,packetSideData:padding,independentOriginal,independentDemuxed};
 await writeFile(root+'/opus-compatibility.json',JSON.stringify(compatibility,null,2));
 console.log('N3.9.4 compatibility',JSON.stringify({stream:audioStream,padding,independentOriginal,independentDemuxed}));
 assert.equal(independentOriginal.exit,0,'Independent decoder must accept standalone Opus');
 assert.equal(independentDemuxed.exit,0,'Independent decoder must accept WebM-demuxed Opus');
 // N3.9.5: consolidated acceptance gate, with only the documented FFmpeg warning tolerated.
 assert.deepEqual(mismatches,[],'Standalone and WebM Opus packet payloads must match');
 assert.equal(originalPackets.length,51,'Expected 51 encoded Opus packets');
 assert.equal(Number(audioStream.sample_rate),48000);
 assert.equal(Number(audioStream.initial_padding),312);
 assert(padding.some(p=>Number(p.discard_padding)===648),'Final Opus discard padding must be preserved');
 assert.equal(standaloneEvidence.warnings.length,0,'Standalone Opus should decode without warnings');
 const knownWarning=/Error parsing Opus packet header\\./;
 const unexpectedWarnings=webmEvidence.warnings.filter(w=>!knownWarning.test(w));
 assert.deepEqual(unexpectedWarnings,[],'Unexpected WebM decoder warnings');
 const regression={
  checkpoint:'RFDR N3.9.5',status:'PASS',video:{codec:'vp8',frames:8,fps:8,pts,visual:{first,mid,last}},
  audio:{codec:'opus',sampleRate:48000,decodedSamples:samples,packetCount:originalPackets.length,
   payloadMismatches:mismatches.length,preSkip:Number(audioStream.initial_padding),discardPadding:648,
   independentDecoders:{standalone:independentOriginal.exit,demuxed:independentDemuxed.exit},
   rms:{before,during,after}},
  durationSeconds:Number(avProbe.format.duration),
  knownFinding:{classification:'FFmpeg WebM/Opus decoder warning; packet payloads identical and independent decoding passes',
   warningObserved:rootCause.webmWarning,warningText:'Error parsing Opus packet header.'}
 };
 await writeFile(root+'/n3-9-5-regression.json',JSON.stringify(regression,null,2));
 console.log('N3.9.5 consolidated regression',JSON.stringify(regression));
 const avReport={status:'PASS',videoFrames:8,decodedAudioSamples:samples,duration:Number(avProbe.format.duration),codecs:avProbe.streams.map(s=>s.codec_name),rms:{before,during,after}};
 await writeFile(root+'/av-report.json',JSON.stringify(avReport,null,2));
 console.log('N3.9',JSON.stringify(avReport));

}finally{await browser?.close();server.kill();}
