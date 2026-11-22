import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { makeProject } from '../src/model.ts';

// RFU4-RC1.1-C0: inspector button must not overflow at compact widths.
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url='http://127.0.0.1:4317';
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try{
 const page=await browser.newPage({viewport:{width:1500,height:900}});
 page.setDefaultTimeout(10000);
 const project=makeProject('Camera inspector responsive layout');
 project.schemaVersion=5;
 const scene=project.scenes[0],panel=scene.panels[0];
 panel.duration=60;
 scene.sequentialCamera={version:1,baseline:{x:960,y:540,zoom:1,rotation:0},panels:{
  [panel.id]:{mode:'animated',keys:[{frame:59,x:1100,y:550,zoom:1.2,rotation:0,interpolation:'linear'}]}
 }};
 await page.goto(url);
 await page.locator('input[type=file]').first().setInputFiles({name:'camera-layout.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.getByTitle('camera (C)',{exact:true}).click();
 const button=page.getByRole('button',{name:'Add intermediate keyframe at current frame'});
 await button.waitFor();
 for(const width of [1500,1100,900]){
  await page.setViewportSize({width,height:900});
  for(const inspectorWidth of [320,240,180]){
   await page.locator('.camera-sequential-inspector').evaluate((el,w)=>{el.style.width=w+'px';},inspectorWidth);
   const geometry=await button.evaluate(el=>{
    const b=el.getBoundingClientRect(),parent=el.parentElement.getBoundingClientRect();
    return {left:b.left,right:b.right,parentLeft:parent.left,parentRight:parent.right,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
   });
   assert(geometry.left>=geometry.parentLeft-1 && geometry.right<=geometry.parentRight+1,
    'Keyframe action must fit inside inspector at '+width+'/'+inspectorWidth+': '+JSON.stringify(geometry));
   assert(geometry.scrollWidth<=geometry.clientWidth+1,'Button text must wrap rather than overflow');
  }
 }
 await page.setViewportSize({width:1500,height:900});
 await page.locator('.camera-sequential-inspector').evaluate(el=>{el.style.width='';});
 await page.getByLabel('Scene camera time').fill('20');
 assert.equal(await button.isEnabled(),true,'Intermediate action enabled at valid frame');
 await button.click();
 assert.equal(await page.getByRole('button',{name:'Select intermediate keyframe 20'}).count(),1,'Wrapped action still creates intermediate keyframe');
 console.log('PASS RFU4-RC1.1-C0: responsive Camera Inspector keyframe action');
}finally{await browser.close();server.kill();}
