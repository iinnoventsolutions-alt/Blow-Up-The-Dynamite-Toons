import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const js=await readFile('diagnostic-output/d4-6-5l-bundle.js');
const server=createServer((req,res)=>{if(req.url==='/bundle.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(js);}else{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html>');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
 for(const stress of [false,true]){
  const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
  const result=await page.evaluate(async stress=>{const {createSilentWebM}=await import('/bundle.js');return createSilentWebM(stress);},stress);
  const label=stress?'stress':'normal',file='diagnostic-output/d4-6-5l-'+label+'.webm';
  await writeFile(file,Buffer.from(result.bytes));
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
  const pts=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_packets','-of','json',file],{encoding:'utf8'})).packets.map(p=>Number(p.pts_time));
  const video=execFileSync('ffmpeg',['-v','error','-i',file,'-map','0:v:0','-pix_fmt','rgb24','-f','rawvideo','-'],{maxBuffer:150*1024*1024});
  const stride=320*180*3,frames=video.length/stride;
  function pixel(i){return Array.from(video.subarray(i*stride+(90*320+160)*3,i*stride+(90*320+160)*3+3));}
  const report={label,encoder:result.report,streams:probe.streams.map(s=>s.codec_name),frames,maxGap:Math.max(...pts.slice(1).map((t,i)=>t-pts[i])),duration:Number(probe.format.duration),red:pixel(60),blend:pixel(69),blue:pixel(75)};
  await writeFile('diagnostic-output/d4-6-5l-'+label+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  assert.deepEqual(report.streams,['vp8'],'Silent WebM must contain video only');
  assert.equal(frames,144);assert.equal(result.report.frames,144);assert.equal(result.report.errors.length,0);
  assert(result.report.monotonic&&report.maxGap<0.045);
  assert(report.duration>5.9&&report.duration<6.1);
  assert(report.red[0]>report.red[2]&&report.blue[2]>report.blue[0]);
  assert(report.blend[0]>25&&report.blend[2]>25);
  await page.close();
 }
 console.log('D4.6.5L silent normal/stress WebM acceptance PASS; cancellation and Electron playback remain unverified.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
