import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {makeProject,makePanel,uid} from '../src/model.ts';

// RC1.1-F0: diagnostic regression, intentionally expects correct geometry.
// Two panels contain identical artwork; the ghost must occupy the same
// drawing-surface pixels as the active artwork at every workspace zoom.
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url='http://127.0.0.1:4317';
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000}});
page.setDefaultTimeout(15000);
try{
 const p=makeProject('F0 onion geometry reproduction'),s=p.scenes[0],first=s.panels[0];
 first.layers[0].strokes.push({id:uid(),tool:'shape',shape:'rectangle',fill:'#000000',color:'#000000',size:2,points:[[400,300,1],[500,400,1]]});
 const copy=makePanel('Identical duplicate');copy.layers[0].strokes=structuredClone(first.layers[0].strokes).map(stroke=>({...stroke,id:uid()}));s.panels.push(copy);
 await page.goto(url);
 await page.locator('input[type=file]').first().setInputFiles({name:'onion-alignment-f0.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});
 await page.locator('.filmstrip .panel-image-button').nth(1).waitFor({state:'visible'});
 await page.locator('.filmstrip .panel-image-button').nth(1).click();
 await page.getByRole('checkbox',{name:'Onion skin',exact:true}).check();
 await page.getByLabel('backward onion panels',{exact:true}).selectOption('1');
 await page.getByLabel('forward onion panels',{exact:true}).selectOption('0');
 const geometry=async()=>page.locator('.stage-paper').evaluate(paper=>{
  const ghost=paper.querySelector('.onion-skin-surface'),drawing=paper.querySelector('.drawing-surface');
  const bounds=(c)=>{const ctx=c.getContext('2d'),{width,height}=c,px=ctx.getImageData(0,0,width,height).data;let minX=width,maxX=-1,minY=height,maxY=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;if(px[i+3]>60&&px[i]+px[i+1]+px[i+2]<680){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}return {x:minX/width,y:minY/height,w:(maxX-minX+1)/width,h:(maxY-minY+1)/height};};
  return {ghost:bounds(ghost),drawing:bounds(drawing),ghostPixels:[ghost.width,ghost.height],drawingPixels:[drawing.width,drawing.height],display:[ghost.getBoundingClientRect().width,drawing.getBoundingClientRect().width]};
 });
 await page.waitForTimeout(350);
 const firstGeometry=await geometry();
 console.log('F0 original zoom geometry:',JSON.stringify(firstGeometry));
 const tolerance=.006;
 for(const key of ['x','y','w','h'])assert.ok(Math.abs(firstGeometry.ghost[key]-firstGeometry.drawing[key])<tolerance,`Onion ${key} differs from duplicated artwork: ${JSON.stringify(firstGeometry)}`);
 await page.getByRole('button',{name:'+',exact:true}).last().click();
 await page.waitForTimeout(250);
 const zoomed=await geometry();
 for(const key of ['x','y','w','h'])assert.ok(Math.abs(zoomed.ghost[key]-zoomed.drawing[key])<tolerance,`Zoomed onion ${key} differs: ${JSON.stringify(zoomed)}`);
 console.log('PASS RC1.1-F0 onion duplicate geometry at multiple zoom levels');
}catch(e){await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/onion-alignment-f0-failure.png'});throw e;}finally{await browser.close();server.kill();}
