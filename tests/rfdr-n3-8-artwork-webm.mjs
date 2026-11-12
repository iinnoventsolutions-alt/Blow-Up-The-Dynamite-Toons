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
 const avReport={status:'PASS',videoFrames:8,decodedAudioSamples:samples,duration:Number(avProbe.format.duration),codecs:avProbe.streams.map(s=>s.codec_name),rms:{before,during,after}};
 await writeFile(root+'/av-report.json',JSON.stringify(avReport,null,2));
 console.log('N3.9',JSON.stringify(avReport));

}finally{await browser?.close();server.kill();}
