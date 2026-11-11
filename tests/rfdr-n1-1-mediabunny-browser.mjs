import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');import('node:fs').then(fs=>fs.createReadStream('diagnostic-output/n1-1-bundle.js').pipe(res));return;}res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>N1.1</title>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 const result=await page.evaluate(async()=>{
  const m=await import('/bundle.js');
  const canceled=await m.createMediabunnyFixture({cancel:true});
  const cases=[];
  for(const audio of [false,true])for(const stress of [false,true]){
   const fixture=await m.createMediabunnyFixture({audio,stress});
   cases.push(fixture);
  }
  return {canceled,cases};
 });
 assert.equal(result.canceled.state,'canceled');
 for(const c of result.cases){
  const name=`n1-1-${c.report.audio?'audio':'silent'}-${c.report.stress?'stress':'normal'}`;
  await writeFile('diagnostic-output/'+name+'.webm',Buffer.from(c.bytes));
  await writeFile('diagnostic-output/'+name+'.json',JSON.stringify(c.report,null,2));
  assert.equal(c.report.state,'finalized');assert(c.report.bytes>1000);
  console.log(JSON.stringify({name,...c.report}));
 }
 console.log('N1.1 Mediabunny fixture generation PASS; strict decoded audio acceptance is a separate gate.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
