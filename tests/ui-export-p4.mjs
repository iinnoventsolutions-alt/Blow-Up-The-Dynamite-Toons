import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {makeProject} from '../src/model.ts';
import {exportFormats,exportProfile,DESKTOP_ENCODED_OUTPUT_MAX_BYTES} from '../src/export-capabilities.ts';
assert.deepEqual(exportFormats.map(f=>[f.extension,f.available]),[['webm',true],['mp4',false],['mov',false]]);
assert.equal(DESKTOP_ENCODED_OUTPUT_MAX_BYTES,512*1024*1024);
const portrait=makeProject('Portrait profile');portrait.width=1080;portrait.height=1920;portrait.scenes[0].panels[0].duration=48;
const profile=exportProfile(portrait);assert.equal(profile.outputWidth,1080);assert.equal(profile.outputHeight,1920);assert.equal(profile.frames,48);assert.equal(profile.seconds,2);
const landscape=makeProject('Large landscape profile');landscape.width=3840;landscape.height=2160;assert.deepEqual([exportProfile(landscape).outputWidth,exportProfile(landscape).outputHeight],[1920,1080]);
// D1 isolation: use a low-resolution, visibly changing two-panel project for actual download tests.
const recordingProject=makeProject('D1 video encoder isolation');recordingProject.width=640;recordingProject.height=360;recordingProject.scenes[0].panels[0].duration=48;
recordingProject.scenes[0].panels[0].layers[0].strokes.push({id:'d1-visible',tool:'shape',color:'#ff0000',size:8,points:[[40,40,1],[320,180,1]],shape:'rectangle',fill:'#ff0000'});
const server=process.env.APP_URL?null:spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url=process.env.APP_URL||'http://127.0.0.1:4317';
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});page.setDefaultTimeout(10000);
const errors=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
try{
 await page.goto(url);
 await page.locator('input[type=file]').first().setInputFiles({name:'p4.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(recordingProject))});
 await page.evaluate(()=>{
  window.__p4D1={events:[]};
  const record=(type,detail)=>window.__p4D1.events.push({type,detail,time:performance.now()});
  new MutationObserver(()=>{const text=document.querySelector('.toast')?.textContent;if(text&&text!==window.__p4D1.lastToast){window.__p4D1.lastToast=text;record('toast',text)}}).observe(document.body,{childList:true,subtree:true,characterData:true});
  const click=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(...args){record('anchor-click',{download:this.download,href:this.href.slice(0,120)});return click.apply(this,args)};
  const create=URL.createObjectURL.bind(URL);
  URL.createObjectURL=function(blob){record('create-object-url',{size:blob.size,type:blob.type});return create(blob)};
 });
 await page.getByRole('button',{name:'Timeline',exact:true}).click();
 await page.getByRole('button',{name:'Formats & limits',exact:true}).click();
 const dialog=page.locator('dialog').filter({has:page.getByRole('heading',{name:'Video formats & limits',exact:true})});
 await dialog.waitFor();
 const content=await dialog.innerText();
 assert.match(content,/WebM \(\.webm\).*Available/);
 assert.match(content,/MP4 \(\.mp4\).*Not yet available/);
 assert.match(content,/MOV \(\.mov\).*Not yet available/);
 assert.match(content,/640 × 360/);
 assert.match(content,/48 frames \(2\.0 seconds\)/);
 assert.match(content,/512 MB/);
 // D1: Exercise both end-to-end download paths. Checking only button enabled state missed real failures.
 const exportDownload=async(action,label)=>{
  const pending=page.waitForEvent('download',{timeout:30000});
  await action();
  await page.waitForTimeout(1200);
  console.log('P4-D1 immediate state:',JSON.stringify({label,state:await page.evaluate(()=>({message:document.querySelector('.toast')?.textContent||'',dialogs:[...document.querySelectorAll('dialog')].map(d=>({open:d.open,title:d.querySelector('h2')?.textContent,content:d.textContent?.slice(0,260)})),progress:[...document.querySelectorAll('progress')].map(p=>({value:p.value,max:p.max})),timelineVisible:!![...document.querySelectorAll('button')].find(b=>b.textContent?.trim()==='Export animatic')})),errors,consoleErrors}));
  const download=await pending.catch(async error=>{const diagnostic=await page.evaluate(()=>({message:document.querySelector('.toast')?.textContent||'',dialogs:[...document.querySelectorAll('dialog')].map(d=>({open:d.open,title:d.querySelector('h2')?.textContent,content:d.textContent?.slice(0,500)})),visible:document.visibilityState,mediaSupported:typeof MediaRecorder==='function',audioState:typeof AudioContext==='function',url:location.href}));console.error('P4-D1 export diagnostic:',JSON.stringify({label,diagnostic,errors,consoleErrors,events:await page.evaluate(()=>window.__p4D1?.events||[])}));throw error;});
  assert.match(download.suggestedFilename(),/\\.webm$/i,label+' should download a WebM file');
  const saved=await download.path();
  assert(saved,'Download should complete rather than merely open an export dialog');
  const {stat}=await import('node:fs/promises');
  assert((await stat(saved)).size>1000,label+' should produce non-empty video');
  await page.getByRole('dialog').filter({has:page.getByRole('heading',{name:'Exporting animatic'})}).waitFor({state:'hidden',timeout:10000});
 };
 await exportDownload(()=>dialog.getByRole('button',{name:'Export WebM',exact:true}).click(),'Formats-dialog WebM');
 await page.getByRole('button',{name:'Formats & limits',exact:true}).click();
 await dialog.waitFor();
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 assert.equal(await dialog.count(),0);
 assert(await page.getByRole('button',{name:'Export animatic',exact:true}).isEnabled(),'Existing WebM export remains available');
 await exportDownload(()=>page.getByRole('button',{name:'Export animatic',exact:true}).click(),'Original animatic export');
 assert.deepEqual(errors,[]);
 console.log('PASS V1124-P4-A-D1: both export actions produce completed WebM downloads; formats, dimensions, duration and output cap correct.');
}finally{await browser.close();server?.kill();}
