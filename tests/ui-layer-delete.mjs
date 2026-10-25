import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {makeProject} from '../src/model.ts';
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4317')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});
page.on('dialog',d=>d.accept());
const pause=()=>page.waitForTimeout(250);
const load=async p=>{await page.locator('input[type=file]').first().setInputFiles({name:'layers.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await pause();};
try{
 await page.goto('http://127.0.0.1:4317');
 const p=makeProject('Layer delete rules'),panel=p.scenes[0].panels[0],initial=panel.layers[0];
 await load(p);
 await page.getByRole('tab',{name:'Layers',exact:true}).click();
 const remove=page.getByRole('button',{name:'Delete selected layer',exact:true});
 assert(await remove.isDisabled(),'Sole initial layer cannot be deleted');
 await page.getByTitle('Add layer',{exact:true}).click();await pause();
 assert.equal(await page.locator('.layer-row').count(),2,'Adding a layer produces two inspector rows');
 await page.getByTitle('Select layer '+initial.name,{exact:true}).click();await pause();
 assert(await remove.isEnabled(),'Initial layer becomes deletable once another layer exists');
 await remove.click();await page.getByRole('button',{name:'Discard / Delete',exact:true}).click();await page.locator('.layer-row').first().waitFor({state:'visible'});await pause();
 assert.equal(await page.locator('.layer-row').count(),1,'Deletion leaves one layer');assert.equal(await page.getByTitle('Select layer '+initial.name,{exact:true}).count(),0,'Initial layer is removed');
 assert(await remove.isDisabled(),'Remaining layer is protected');
 await page.getByTitle('Undo (⌘/Ctrl Z)',{exact:true}).click();await pause();
 assert.equal(await page.locator('.layer-row').count(),2,'Undo restores second layer row');assert.equal(await page.getByTitle('Select layer '+initial.name,{exact:true}).count(),1,'Undo restores initial layer');
 console.log('PASS layer deletion: sole-layer protection, initial-layer deletion with replacement, remaining-layer protection and undo.');
}finally{await browser.close();server.kill();}
