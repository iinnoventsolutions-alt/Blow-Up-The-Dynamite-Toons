import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

await mkdir('diagnostic-output',{recursive:true});
const server=createServer((_req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end('<!doctype html><title>Opus duration roundtrip</title>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const report=await page.evaluate(async()=>{
  const sampleRate=48000,packetSamples=960,packetCount=150,expectedSamples=144000;
  const result={secureContext:isSecureContext,audioEncoder:typeof AudioEncoder==='function',audioDecoder:typeof AudioDecoder==='function',sampleRate,packetSamples,packetCount,expectedSamples};
  if(!result.audioEncoder||!result.audioDecoder)return result;
  const config={codec:'opus',sampleRate,numberOfChannels:1,bitrate:64000};
  result.encoderSupported=(await AudioEncoder.isConfigSupported(config)).supported;
  const decodeConfig={codec:'opus',sampleRate,numberOfChannels:1};
  result.decoderSupported=(await AudioDecoder.isConfigSupported(decodeConfig)).supported;
  if(!result.encoderSupported||!result.decoderSupported)return result;
  const chunks=[],encoderErrors=[],decoderErrors=[],decoded=[];
  let metadata=null;
  const encoder=new AudioEncoder({output:(chunk,meta)=>{chunks.push(chunk);if(meta?.decoderConfig)metadata=meta.decoderConfig;},error:e=>encoderErrors.push(String(e))});
  encoder.configure(config);
  for(let i=0;i<packetCount;i++){
   const data=new Float32Array(packetSamples);
   const start=i*packetSamples;
   for(let j=0;j<packetSamples;j++)data[j]=start+j<72000?0.15*Math.sin(2*Math.PI*440*(start+j)/sampleRate):0;
   const frame=new AudioData({format:'f32-planar',sampleRate,numberOfChannels:1,numberOfFrames:packetSamples,timestamp:Math.round(start*1e6/sampleRate),data});
   encoder.encode(frame);frame.close();
  }
  await encoder.flush();encoder.close();
  result.encodedChunks=chunks.length;
  result.encodedEndpoint=chunks.at(-1)?.timestamp+(chunks.at(-1)?.duration??0);
  result.encoderErrors=encoderErrors;
  result.decoderMetadata={codec:metadata?.codec??null,sampleRate:metadata?.sampleRate??null,numberOfChannels:metadata?.numberOfChannels??null,descriptionBytes:metadata?.description?.byteLength??0};
  const decoder=new AudioDecoder({output:frame=>{decoded.push({timestamp:frame.timestamp,duration:frame.duration,numberOfFrames:frame.numberOfFrames,sampleRate:frame.sampleRate});frame.close();},error:e=>decoderErrors.push(String(e))});
  try {
   decoder.configure(metadata??decodeConfig);
   for(const chunk of chunks)decoder.decode(chunk);
   await decoder.flush();
  }catch(e){decoderErrors.push(String(e));}
  finally{decoder.close();}
  result.decoderErrors=decoderErrors;
  result.decodedFrames=decoded.length;
  result.decodedSamples=decoded.reduce((n,f)=>n+f.numberOfFrames,0);
  result.decodedFirstTimestamp=decoded[0]?.timestamp??null;
  result.decodedLastTimestamp=decoded.at(-1)?.timestamp??null;
  result.decodedEndpoint=decoded.at(-1)?decoded.at(-1).timestamp+decoded.at(-1).duration:null;
  result.decodedMonotonic=decoded.every((f,i)=>i===0||f.timestamp>decoded[i-1].timestamp);
  result.decodedTail=decoded.slice(-5);
  result.excessSamples=result.decodedSamples-expectedSamples;
  result.excessDurationMicroseconds=result.decodedEndpoint===null?null:result.decodedEndpoint-3000000;
  return result;
 });
 await writeFile('diagnostic-output/opus-roundtrip-duration.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 assert(report.secureContext&&report.audioEncoder&&report.audioDecoder,'Audio codec interfaces unavailable');
 assert(report.encoderSupported&&report.decoderSupported,'Opus encode/decode unsupported');
 assert.equal(report.encoderErrors.length,0);
 assert(report.encodedChunks>=150,'Unexpectedly few Opus output chunks');
 // Decode outcome is diagnostic until Opus priming and end-padding handling are established.
 console.log('D4.6.4A diagnostic: inspect decodedSamples, decodedEndpoint, and decoderErrors before setting muxer trim policy.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
