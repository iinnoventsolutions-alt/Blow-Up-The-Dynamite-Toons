import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const js=await readFile('diagnostic-output/d4-6-5k-bundle.js');
const server=createServer((req,res)=>{if(req.url==='/bundle.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(js);}else{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html>');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
 for(const stress of [false,true]){
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);
  const result=await page.evaluate(async stress=>{const {createExtendedWebM}=await import('/bundle.js');return createExtendedWebM(stress);},stress);
  const label=stress?'stress':'normal';
  await writeFile('diagnostic-output/d4-6-5k-'+label+'.webm',Buffer.from(result.bytes));
  await writeFile('diagnostic-output/d4-6-5k-'+label+'-encoder.json',JSON.stringify(result.report,null,2));
  assert.equal(result.report.errors.length,0);assert.equal(result.report.frames,144);
  assert(result.report.videoMonotonic&&result.report.audioMonotonic);
  console.log(JSON.stringify(result.report));
  await page.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
