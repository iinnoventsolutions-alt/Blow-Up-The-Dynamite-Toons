import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { makeProject, uid } from '../src/model.ts';
import { contourFromPoints } from '../src/artwork.ts';

const server = spawn(process.execPath, ['desktop/preview.cjs'], { stdio: 'ignore' });
for (let n = 0; n < 100; n++) {
  try { if ((await fetch('http://127.0.0.1:4317')).ok) break; } catch {}
  await new Promise(resolve => setTimeout(resolve, 100));
}
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
const page = await browser.newPage({viewport: {width: 1500, height: 1000}, acceptDownloads: true});
page.setDefaultTimeout(12000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => dialog.accept());
const panelOf = project => project.scenes[0].panels[0];
const waitReady = async () => { await page.locator('.stage-area[aria-busy="false"]').waitFor(); };
const load = async project => {
  await page.locator('input[type=file]').first().setInputFiles({name:'reliability.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
  await waitReady();
};
const save = async () => {
  await waitReady();
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name:'Save project',exact:true}).click();
  return JSON.parse(await readFile(await (await download).path(), 'utf8'));
};
const choose = async title => {
  await page.getByTitle(title, {exact:true}).click();
  await waitReady();
};
const at = async (x,y) => {
  const rect = await page.getByLabel('Drawing canvas', {exact:true}).boundingBox();
  assert(rect, 'Canvas is visible');
  return {x: rect.x + rect.width*x, y: rect.y + rect.height*y};
};
const drag = async (a,b,c,d) => {
  const start=await at(a,b),end=await at(c,d);
  await page.mouse.move(start.x,start.y);
  await page.mouse.down();
  await page.mouse.move(end.x,end.y,{steps:12});
  await page.mouse.up();
  await waitReady();
};
const dragHandle = async (selector,dx,dy) => {
  const handle=await page.locator(selector).first().boundingBox();
  assert(handle, 'Editor handle should be visible: ' + selector);
  const x=handle.x+handle.width/2,y=handle.y+handle.height/2;
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(x+dx,y+dy,{steps:12});await page.mouse.up();
  await waitReady();
};
const selectAt = async(x,y) => {const p=await at(x,y);await page.mouse.click(p.x,p.y);await waitReady();};
const selectInkCenter=async () => {
  const center=await page.getByLabel('Drawing canvas',{exact:true}).evaluate(canvas=>{
    const {data}=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
    let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
    for(let i=0;i<data.length;i+=4){
      if(data[i]<180&&data[i+1]<180&&data[i+2]<180){
        const x=(i/4)%canvas.width,y=Math.floor(i/4/canvas.width);
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      }
    }
    if(maxX<0) return null;
    // The midpoint of a text bounding box often lands on whitespace.
    // Pick an actual dark glyph pixel near its center instead.
    const targetX=(minX+maxX)/2,targetY=(minY+maxY)/2;
    let closest=null,distance=Infinity;
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const i=(y*canvas.width+x)*4;
      if(data[i]<120&&data[i+1]<120&&data[i+2]<120){
        const score=(x-targetX)**2+(y-targetY)**2;
        if(score<distance){distance=score;closest={x:(x+.5)/canvas.width,y:(y+.5)/canvas.height};}
      }
    }
    return closest;
  });
  assert(center,'Text must be visibly rendered before selection');
  await selectAt(center.x,center.y);
  try { await page.locator('[data-mode=resize]').first().waitFor({timeout:1500}); }
  catch { console.error('Text-selection diagnostics:',JSON.stringify({point:center,mode:await page.getByLabel('Selection mode',{exact:true}).inputValue(),tool:await page.locator('.stage-hint').innerText(),handles:await page.locator('[data-mode=resize]').count()})); }
};

try {
  await mkdir('test-results',{recursive:true});
  await page.goto('http://127.0.0.1:4317');
  // Browser-side frame latency: isolates UI scheduling from Playwright's mouse/send overhead.
  await page.evaluate(() => {
    window.__drawingFrameSamples = [];
    const surface = document.querySelector('.art-interaction');
    surface.addEventListener('pointermove', () => {
      if ((window.__drawingFrameSamples.length || 0) >= 2000) return;
      const start = performance.now();
      requestAnimationFrame(() => window.__drawingFrameSamples.push(performance.now() - start));
    }, {capture: true});
  });
  const project=makeProject('Round 1 reliable artwork');
  await load(project);

  // Rapid sequential vector strokes must persist in model and roundtrip.
  const start=performance.now();
  await choose('brush (B)');
  for(let i=0;i<4;i++)await drag(.13,.15+i*.08,.43,.15+i*.08);
  await choose('Pencil (P)');
  for(let i=0;i<4;i++)await drag(.55,.15+i*.08,.86,.15+i*.08);
  let saved=await save();
  assert.equal(panelOf(saved).layers[0].strokes.length,8,'All sequential Brush/Pencil strokes persist');
  assert.equal(panelOf(saved).layers[0].strokes.filter(s=>s.tool==='brush').length,4);
  assert.equal(panelOf(saved).layers[0].strokes.filter(s=>s.tool==='pencil').length,4);
  await load(saved);
  assert.equal(panelOf(await save()).layers[0].strokes.length,8,'Strokes survive file roundtrip');

  // Repeated erasing must persist and survive redraw and reload.
  await choose('eraser (E)');
  await page.getByLabel('Stroke width',{exact:true}).fill('80');
  await drag(.27,.11,.27,.48);
  await drag(.7,.11,.7,.48);
  saved=await save();
  assert.equal(panelOf(saved).layers[0].strokes.filter(s=>s.tool==='eraser').length,2,'Both eraser gestures persist');
  await load(saved);
  assert.equal(panelOf(await save()).layers[0].strokes.filter(s=>s.tool==='eraser').length,2,'Eraser state survives reload');

  // Text selection resize must retain the new dimensions after a redraw and reload.
  const text=makeProject('Round 1 transform reliability');
  panelOf(text).layers[0].strokes=[{id:uid(),tool:'text',color:'#172b43',size:1,text:'Resize persists',font:'Arial',fontSize:80,align:'left',lineSpacing:1.2,points:[[600,300,1],[1000,400,1]]}];
  await load(text);
  await choose('Select (V)');
  await selectInkCenter();
  assert.equal(await page.locator('[data-mode=resize]').count(),4);
  const oldBox=await page.locator('[data-mode=move]').first().evaluate(n=>({width:Number(n.getAttribute('width')),height:Number(n.getAttribute('height'))}));
  await dragHandle('[data-mode=resize][data-corner=se]',40,24);
  const newBox=await page.locator('[data-mode=move]').first().evaluate(n=>({width:Number(n.getAttribute('width')),height:Number(n.getAttribute('height'))}));
  assert(newBox.width>oldBox.width || newBox.height>oldBox.height,'Text resize updates selected geometry');
  saved=await save();
  await load(saved);
  await choose('Select (V)');
  await selectInkCenter();
  const reloaded=await page.locator('[data-mode=move]').first().evaluate(n=>({width:Number(n.getAttribute('width')),height:Number(n.getAttribute('height'))}));
  assert(Math.abs(reloaded.width-newBox.width)<2 && Math.abs(reloaded.height-newBox.height)<2,'Text resize remains after reload');

  // Pencil Editor point drag must not bounce back.
  const edit=makeProject('Editor reliability');
  const pts=[[850,500,.5],[960,560,.8],[1080,500,.6]];
  panelOf(edit).layers[0].strokes=[
    {id:uid(),tool:'pencil',color:'#172b43',size:35,points:pts},
    {id:uid(),tool:'brush',color:'#172b43',size:40,points:[[300,300,1],[400,330,1],[500,300,1]],contours:[contourFromPoints([[300,300,1],[400,330,1],[500,300,1]],40)]}
  ];
  await load(edit);
  await choose('Pencil Editor');
  await selectAt(960/1920,560/1080);
  await dragHandle('[data-mode=point][data-index="1"]',0,35);
  saved=await save();
  assert(panelOf(saved).layers[0].strokes[0].points[1][1]>560,'Pencil point movement persisted');
  await load(saved);
  assert.deepEqual(panelOf(await save()).layers[0].strokes[0].points,panelOf(saved).layers[0].strokes[0].points);

  await choose('Contour Editor');
  await selectAt(400/1920,330/1080);
  const original=panelOf(await save()).layers[0].strokes[1].contours[0];
  await dragHandle('[data-mode=point][data-index="1"]',0,35);
  saved=await save();
  assert.notDeepEqual(panelOf(saved).layers[0].strokes[1].contours[0],original,'Contour movement persisted');
  await load(saved);
  assert.deepEqual(panelOf(await save()).layers[0].strokes[1].contours,panelOf(saved).layers[0].strokes[1].contours);

  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('PASS Round 1 reliability: consecutive Brush/Pencil strokes, repeat erasers, text resize, Pencil and Contour point movement, and save/reopen.');
  const samples = await page.evaluate(() => window.__drawingFrameSamples || []);
  const sorted = samples.slice().sort((a,b)=>a-b);
  const p95 = sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))] ?? 0;
  console.log('Drawing pointer-to-frame scheduling (browser, informational):',JSON.stringify({samples:samples.length,p95Ms:Math.round(p95*10)/10,maxMs:Math.round((sorted.at(-1)||0)*10)/10}));
  console.log('Round 1 browser gesture duration (includes Playwright latency):',Math.round(performance.now()-start),'ms');
} catch (error) {
  await page.screenshot({path:'test-results/round1-reliability-failure.png'}).catch(()=>{});
  console.error('Round 1 browser errors:',errors);
  throw error;
} finally {
  await browser.close();
  server.kill();
}
