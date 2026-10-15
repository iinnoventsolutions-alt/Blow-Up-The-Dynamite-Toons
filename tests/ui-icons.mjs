import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir,readFile } from 'node:fs/promises';
import { makeProject,makeLayer } from '../src/model.ts';
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4317')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());const wait=()=>page.waitForTimeout(180);
const load=async p=>{await page.locator('input[type=file]').first().setInputFiles({name:'tools.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await wait();};
const save=async()=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save project',exact:true}).click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));};
const choose=async title=>{await page.getByTitle(title,{exact:true}).click();await wait();};
const pos=async(x,y)=>{const b=await page.getByLabel('Drawing canvas',{exact:true}).boundingBox();return {x:b.x+b.width*x,y:b.y+b.height*y};};
const click=async(x,y)=>{const p=await pos(x,y);await page.mouse.click(p.x,p.y);await wait();};
const drag=async(x,y,a,b)=>{const p=await pos(x,y),q=await pos(a,b);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(q.x,q.y,{steps:20});await page.mouse.up();await wait();};
const pixel=async(x,y)=>page.getByLabel('Drawing canvas',{exact:true}).evaluate((c,[x,y])=>[...c.getContext('2d').getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data],[x,y]);
try{
 await mkdir('test-results',{recursive:true});await page.goto('http://127.0.0.1:4317');const p=makeProject('Icon review');await load(p);const before=await save();assert.equal(await page.locator('.tool-rail [data-icon-style=updated]').count(),17);
 const updated=await page.locator('.tool-rail svg[data-tool-icon]').evaluateAll(nodes=>nodes.map(n=>({tool:n.dataset.toolIcon,svg:n.outerHTML})));
 const titles=['Select (V)','brush (B)','Pencil (P)','Contour Editor','Pencil Editor','Text (T)','eraser (E)','Paint Bucket (F)','Shape (U)','Color Picker (I)','hand (H)','Rotate View (R)','camera (C)','Select by Color'];
 for(const title of titles){await choose(title);assert((await page.getByTitle(title,{exact:true}).getAttribute('class')).includes('active'));}
 assert.deepEqual(await save(),before,'Tool icon review never edits artwork');await choose('brush (B)');await page.screenshot({path:'test-results/icons-updated.png'});
 const prefs=async()=>{await page.getByTitle('Preferences',{exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Drawing',exact:true}).click();await wait();};await prefs();const select=page.getByLabel('Drawing tool icons',{exact:true});assert.equal(await select.inputValue(),'updated');await select.selectOption('classic');await page.getByRole('button',{name:'Done',exact:true}).click();assert.equal(await page.locator('.tool-rail [data-icon-style=updated]').count(),0);assert.equal(await page.locator('.tool-rail svg[data-icon-style=classic]').count(),14);assert.equal(await page.locator('.tool-rail .color-button svg').count(),0);
 const classic=await page.locator('.tool-rail svg[data-tool-icon]').evaluateAll(nodes=>nodes.map(n=>({tool:n.dataset.toolIcon,svg:n.outerHTML})));await page.screenshot({path:'test-results/icons-classic.png'});assert.deepEqual(await save(),before);
 await page.reload();await wait();await load(p);assert.equal(await page.locator('.tool-rail svg[data-icon-style=classic]').count(),14);await prefs();assert.equal(await select.inputValue(),'classic');await select.selectOption('updated');await page.getByRole('button',{name:'Done',exact:true}).click();assert.equal(await page.locator('.tool-rail [data-icon-style=updated]').count(),17);
 await page.setViewportSize({width:1100,height:740});await page.getByTitle('Export current panel as PNG',{exact:true}).scrollIntoViewIfNeeded();assert(await page.getByTitle('Export current panel as PNG',{exact:true}).isVisible());await page.getByTitle('Select (V)',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/icons-compact.png'});const {writeFile}=await import('node:fs/promises');await writeFile('/tmp/icon-review-data.json',JSON.stringify({classic,updated}));assert.deepEqual(errors,[]);console.log('PASS icons: all 14 tools and utility/palette icons, active states, Classic/Updated switch, unchanged artwork, persistence and compact rail access.');
}finally{await browser.close();server.kill();}
