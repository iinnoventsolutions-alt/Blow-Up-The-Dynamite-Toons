import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

await mkdir('diagnostic-output',{recursive:true});
const server=createServer((_req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end('<!doctype html><title>Audio feasibility</title>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const result=await page.evaluate(async()=>{
  const sampleRate=48000,channels=1,framesPerPacket=960,packets=150;
  const report={secureContext:isSecureContext,audioEncoder:typeof AudioEncoder==='function',audioData:typeof AudioData==='function',offlineAudioContext:typeof OfflineAudioContext==='function',codec:'opus',sampleRate,channels,framesPerPacket,packets};
  if(!report.audioEncoder||!report.audioData||!report.offlineAudioContext)return report;
  const config={codec:'opus',sampleRate,numberOfChannels:channels,bitrate:64000};
  const support=await AudioEncoder.isConfigSupported(config);report.configSupported=support.supported;
  if(!support.supported)return report;
  const offline=new OfflineAudioContext(channels,sampleRate*3,sampleRate);
  const osc=offline.createOscillator();osc.frequency.value=440;
  const gain=offline.createGain();gain.gain.value=0.2;osc.connect(gain).connect(offline.destination);
  osc.start(0);osc.stop(1.5);
  const rendered=await offline.startRendering();
  const samples=rendered.getChannelData(0);
  const chunks=[],errors=[];
  const encoder=new AudioEncoder({output:chunk=>chunks.push({timestamp:chunk.timestamp,duration:chunk.duration??null,byteLength:chunk.byteLength,type:chunk.type}),error:e=>errors.push(String(e))});
  encoder.configure(config);
  for(let i=0;i<packets;i++){
   const start=i*framesPerPacket;
   const data=new Float32Array(framesPerPacket);data.set(samples.subarray(start,start+framesPerPacket));
   const audio=new AudioData({format:'f32-planar',sampleRate,numberOfFrames:framesPerPacket,numberOfChannels:channels,timestamp:Math.round(start*1e6/sampleRate),data});
   encoder.encode(audio);audio.close();
  }
  await encoder.flush();encoder.close();
  report.errors=errors;report.encodedChunks=chunks.length;
  report.firstTimestamp=chunks[0]?.timestamp??null;
  report.lastTimestamp=chunks.at(-1)?.timestamp??null;
  report.timestampsMonotonic=chunks.every((c,i)=>i===0||c.timestamp>chunks[i-1].timestamp);
  report.timestampsMatchSamples=chunks.length===packets&&chunks.every((c,i)=>c.timestamp===i*20000);
  report.durationMicroseconds=packets*framesPerPacket*1e6/sampleRate;
  report.chunkSample=chunks.slice(0,5);report.tailChunks=chunks.slice(-5);
  report.expectedInputTimestamps=Array.from({length:packets},(_,i)=>i*20000);
  report.outputPrefixMatchesInput=chunks.slice(0,packets).every((c,i)=>c.timestamp===i*20000);
  report.extraChunks=chunks.slice(packets);
  report.extraChunksAtOrAfterDuration=report.extraChunks.every(c=>c.timestamp>=3000000);
  return report;
 });
 await writeFile('diagnostic-output/audio-opus-feasibility.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
 assert(result.secureContext&&result.audioEncoder&&result.audioData&&result.offlineAudioContext,'Required audio APIs unavailable');
 assert(result.configSupported,'Opus encoder unsupported');
 assert.equal(result.errors.length,0);
 assert(result.encodedChunks>=150,'Encoder returned fewer packets than submitted blocks');
 assert(result.timestampsMonotonic,'Encoded audio timestamps not monotonic');
 assert(result.outputPrefixMatchesInput,'Encoded audio packet prefix does not match sample timestamps');
 assert(result.extraChunksAtOrAfterDuration,'Unexpected extra packet before input timeline end');
 assert.equal(result.durationMicroseconds,3000000);
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
