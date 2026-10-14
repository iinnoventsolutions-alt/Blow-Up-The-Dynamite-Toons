import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {makeProject,makePanel,makeScene,uid} from '../src/model.ts';
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4317')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());const wait=()=>page.waitForTimeout(180);
const load=async p=>{await page.locator('input[type=file]').first().setInputFiles({name:'text-playback.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await wait();};
const save=async()=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save project',exact:true}).click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));};

try{
 await page.goto('http://127.0.0.1:4317');
 const p=makeProject('Onion test');p.scenes[0].panels=Array.from({length:7},(_,i)=>{const panel=makePanel(`Panel ${i+1}`);panel.layers[0].strokes.push({id:uid(),tool:'shape',shape:'rectangle',fill:'#000000',color:'#000000',size:2,points:[[100+i*220,200,1],[200+i*220,300,1]]});return panel;});p.scenes.push(makeScene('Other'));
 await load(p);const toggle=page.getByRole('checkbox',{name:'Onion skin',exact:true});assert.equal(await toggle.isChecked(),false);
 await page.locator('.filmstrip .panel-image-button').nth(3).click();await toggle.check();await page.getByLabel('backward onion panels',{exact:true}).selectOption('3');await page.getByLabel('forward onion panels',{exact:true}).selectOption('3');await wait();
 const pixel=async i=>page.locator('.onion-skin-surface').evaluate((c,i)=>[...c.getContext('2d').getImageData(150+i*220,250,1,1).data],i);
 const red=await pixel(2),green=await pixel(4);assert(red[0]>red[1]&&red[3]>0);assert(green[1]>green[0]&&green[3]>0);assert((await pixel(0))[3]<red[3]);assert.equal((await pixel(3))[3],0);
 const original=JSON.stringify(p);assert.equal(JSON.stringify(await save()),original,'Ghosts never enter project data');
 await page.getByLabel('backward onion panels',{exact:true}).selectOption('0');await wait();assert.equal((await pixel(2))[3],0);assert((await pixel(4))[3]>0);
 await toggle.uncheck();assert.equal(await page.locator('.onion-skin-surface').count(),0);await toggle.check();await page.getByLabel('backward onion panels',{exact:true}).selectOption('3');
 await page.locator('.filmstrip .panel-image-button').nth(7).click();await wait();assert.equal(await page.locator('.onion-skin-surface').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)),false,'No cross-scene ghosts');
 await page.locator('.filmstrip .panel-image-button').nth(3).click();await wait();
 // Flatten a neighbor into an image with white paper: white stays transparent, black is tinted.
 const bitmap=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1920;c.height=1080;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,1920,1080);x.fillStyle='black';x.fillRect(980,200,100,100);return c.toDataURL();});p.scenes[0].panels[4].layers[0].kind='bitmap';p.scenes[0].panels[4].layers[0].image=bitmap;p.scenes[0].panels[4].layers[0].strokes=[];await load(p);await page.locator('.filmstrip .panel-image-button').nth(3).click();await wait();assert((await pixel(4))[3]>0);assert.equal(await page.locator('.onion-skin-surface').evaluate(c=>c.getContext('2d').getImageData(1800,900,1,1).data[3]),0);
 p.scenes[0].panels[4].layers[0].visible=false;await load(p);await page.locator('.filmstrip .panel-image-button').nth(3).click();await wait();assert.equal((await pixel(4))[3],0,'Hidden neighbor layers excluded');
 await page.setViewportSize({width:1100,height:740});await wait();for(const selector of ['.onion-controls','.view-controls','.stage-playback']){const b=await page.locator(selector).boundingBox();const toolbar=await page.locator('.stage-toolbar').boundingBox();assert(b.x>=toolbar.x&&b.x+b.width<=toolbar.x+toolbar.width+1,selector+' fits');}await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/onion-compact.png'});
 await page.setViewportSize({width:1500,height:1000});await load(makeProject('Onion visual'));await load(p);await page.locator('.filmstrip .panel-image-button').nth(3).click();await wait();await page.screenshot({path:'test-results/onion-drawing.png'});
 await page.getByLabel('Drawing playback controls',{exact:true}).getByRole('button',{name:'Play',exact:true}).click();await wait();assert.equal(await page.locator('.onion-skin-surface').count(),0);await page.getByLabel('Drawing playback controls',{exact:true}).getByTitle('Stop playback',{exact:true}).click();await wait();assert.equal(await page.locator('.onion-skin-surface').count(),1);
 await page.getByRole('button',{name:'Timeline',exact:true}).click();assert.equal(await page.locator('.onion-controls').count(),0);assert.equal(await page.locator('.onion-skin-surface').count(),0);
 await page.reload();await wait();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('innovent.onion')).backward),3);assert.deepEqual(errors,[]);console.log('PASS onion: tint/distance, independent counts, scene isolation, bitmap whites, hidden layers, save isolation, playback, compact layout, device persistence.');
}finally{await browser.close();server.kill();}
