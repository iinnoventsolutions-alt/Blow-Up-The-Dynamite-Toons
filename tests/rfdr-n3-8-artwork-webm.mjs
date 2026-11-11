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
  const make=(id,color)=>({id,name:id,duration:4,dialogue:'',action:'',slugging:'',notes:'',layers:[{id:'l'+id,name:'l',visible:true,locked:false,opacity:1,strokes:[{id:'s'+id,tool:'shape',shape:'rectangle',color,size:1,fill:color,points:[[0,0,1],[64,64,1]]}]}]});
  const project={format:'innovent-storyboard',schemaVersion:5,id:'n38',title:'N3.8',subtitle:'',width:64,height:64,fps:8,
   scenes:[{id:'scene',name:'Scene',camera:[],panels:[make('a','#ff0000'),make('b','#0000ff')]}],
   transitions:[{id:'d',fromId:'a',toId:'b',type:'dissolve',duration:3,direction:'right'}],audioAssets:[],audioTracks:[]};
  const frames=[];
  for(let i=0;i<8;i++){const f=await renderIsolatedProjectFrame(project,i,{width:64});frames.push({timestampUs:f.timestampUs,rgba:Array.from(f.pixels)});}
  return frames;
 });
 assert.equal(result.length,8);
 assert.deepEqual(result.map(f=>f.timestampUs),[0,125000,250000,375000,500000,625000,750000,875000]);
 const raw=Buffer.concat(result.map(f=>Buffer.from(f.rgba)));
 const rawPath=root+'/frames.rgba',video=root+'/artwork.webm';
 await writeFile(rawPath,raw);
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size','64x64','-framerate','8','-i',rawPath,'-an','-c:v','libvpx','-b:v','400k','-deadline','good','-cpu-used','2','-f','webm',video]);
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
 const first=center(0),last=center(7),mid=center(3);
 assert(first[0]>first[2]+100,'First artwork frame is red');
 assert(last[2]>last[0]+100,'Last artwork frame is blue');
 assert(mid[0]>10&&mid[2]>10,'Transition blends red and blue');
 const report={status:'PASS',frames:8,fps:8,duration:Number(probe.format.duration),codec:stream.codec_name,pts,first,mid,last,bytes:(await readFile(video)).length};
 await writeFile(root+'/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser?.close();server.kill();}
