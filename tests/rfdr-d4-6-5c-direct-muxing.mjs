import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
await mkdir('diagnostic-output',{recursive:true});
const js=await readFile('diagnostic-output/d4-6-5c-bundle.js');
const server=createServer((req,res)=>{if(req.url==='/bundle.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(js);}else{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><script type="module" src="/bundle.js"></script>');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
 for(const stress of [false,true]){
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);
  const result=await page.evaluate(async stress=>{const {createWebM}=await import('/bundle.js');return await createWebM(stress);},stress);
  const label=stress?'stress':'normal',file='diagnostic-output/d4-6-5c-'+label+'.webm';
  await writeFile(file,Buffer.from(result.bytes));
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,codec_type,sample_rate','-show_entries','format=duration','-of','json',file],{encoding:'utf8'}));
  const pts=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',file],{encoding:'utf8'}).trim().split(/\s+/).map(Number);
  const decoded='diagnostic-output/d4-6-5c-'+label+'.f32';
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',file,'-map','0:a:0','-f','f32le','-ac','1','-ar','48000',decoded]);
  const {stat}=await import('node:fs/promises');
  const audioSamples=(await stat(decoded)).size/4;
  const report={...result.report,streams:probe.streams,duration:Number(probe.format.duration),decodedFrames:pts.length,firstPTS:pts[0],lastPTS:pts.at(-1),maxGap:Math.max(...pts.slice(1).map((x,i)=>x-pts[i])),decodedAudioSamples:audioSamples};
  await writeFile('diagnostic-output/d4-6-5c-'+label+'.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  assert.equal(report.errors.length,0);assert.equal(report.videoChunks,72);assert.equal(report.decodedFrames,72);
  assert(report.videoMonotonic&&report.audioMonotonic);
  assert.deepEqual(new Set(probe.streams.map(x=>x.codec_name)),new Set(['vp8','opus']));
  assert(report.maxGap<0.045,'Nonuniform encoded video PTS');
  assert(Math.abs(report.duration-3)<0.08,'Unexpected container duration');
  // Exact Opus trim is a separate acceptance gate; report decoded sample discrepancy explicitly.
  console.log('Opus decoded samples:',audioSamples,'expected:',144000,'delta:',audioSamples-144000);
  await page.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
