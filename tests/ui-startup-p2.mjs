import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const server=process.env.APP_URL?null:spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url=process.env.APP_URL||'http://127.0.0.1:4317';
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000}});
page.setDefaultTimeout(10000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(url);
 assert.equal(await page.locator('.startup-splash').count(),1,'splash shows on fresh window');
 assert.equal(await page.locator('.startup-splash-version').count(),1,'splash retains build branding');
 await page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('innovent-project-storage',1);req.onupgradeneeded=()=>req.result.createObjectStore('records');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  await new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put([{id:'p2-one',name:'Original storyboard.issb',text:'cached original'}],'recent');tx.oncomplete=resolve;tx.onerror=reject;});db.close();
 });
 await page.reload();
 assert.equal(await page.locator('.startup-splash').count(),0,'splash does not repeat on reload in the same window');
 await page.getByRole('button',{name:'Original storyboard.issb Open storyboard'}).waitFor();
 const clear=page.getByRole('button',{name:'Clear recent projects'});
 await clear.click();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 assert.equal(await page.locator('.recent-card').count(),1,'cancel leaves recent entries intact');
 await clear.click();
 assert.match(await page.locator('.dialog-intro').textContent(),/will not be deleted/);
 await page.getByRole('button',{name:'Discard / Delete',exact:true}).click();
 await page.getByText('A fresh canvas awaits').waitFor();
 assert.equal(await page.locator('.recent-card').count(),0,'recent shortcuts cleared');
 assert.equal(await page.locator('.clear-recent-button').count(),0,'clear action hidden for empty list');
 const raw=await page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('innovent-project-storage',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  const tx=db.transaction('records','readonly');const data=await new Promise((resolve,reject)=>{const req=tx.objectStore('records').get('recent');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});db.close();return data;
 });
 assert.equal(raw[0].text,'cached original','clear keeps underlying cached project data');
 await page.reload();assert.equal(await page.locator('.recent-card').count(),0,'clear persists after reload');
 assert.equal(await page.locator('.startup-splash').count(),0,'splash remains one-time');
 const second=await browser.newContext();const fresh=await second.newPage();await fresh.goto(url);
 assert.equal(await fresh.locator('.startup-splash').count(),1,'new application window session shows splash');
 await second.close();assert.deepEqual(errors,[]);
 console.log('PASS V1124-P2: once-per-session splash, build branding, clear confirmation/cancel, preserved browser cache and empty state.');
}finally{await browser.close();server?.kill();}
