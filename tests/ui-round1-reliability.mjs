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
  const project=makeProject('Round 1 reliable artwork');
  await load(project);
  await page.locator('.art-interaction').waitFor({state:'attached'});
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

  // Do not await stage readiness between gestures: reproduce fast consecutive inputs.
  const burst=makeProject('Rapid vector gestures');
  await load(burst);
  const burstDrag=async(a,b,c,d)=>{
    const start=await at(a,b),end=await at(c,d);
    await page.mouse.move(start.x,start.y);
    await page.mouse.down();
    await page.mouse.move(end.x,end.y,{steps:3});
    await page.mouse.up();
  };
  await choose('brush (B)');
  for(let i=0;i<8;i++)await burstDrag(.1,.12+i*.055,.4,.12+i*.055);
  await choose('Pencil (P)');
  for(let i=0;i<8;i++)await burstDrag(.55,.12+i*.055,.85,.12+i*.055);
  saved=await save();
  assert.equal(panelOf(saved).layers[0].strokes.length,16,'Rapid brush/pencil gestures must not overwrite earlier strokes');
  assert.equal(panelOf(saved).layers[0].strokes.filter(s=>s.tool==='brush').length,8);
  assert.equal(panelOf(saved).layers[0].strokes.filter(s=>s.tool==='pencil').length,8);

  // User reproduction: a quick stroke on either Vector or Bitmap must persist
  // without a 1-2 second hold before the pointer is released.
  for(const kind of ['vector','bitmap']){
    const quick=makeProject('Immediate release '+kind);
    panelOf(quick).layers[0].kind=kind;
    await load(quick);
    for(const name of ['brush (B)','Pencil (P)']){
      await choose(name);
      const from=await at(name.startsWith('brush')?.12:.55,.35);
      const to=await at(name.startsWith('brush')?.40:.83,.35);
      await page.mouse.move(from.x,from.y);
      await page.mouse.down();
      await page.mouse.move(to.x,to.y,{steps:1});
      await page.mouse.up();
      await waitReady();
    }
    // Bitmap layers are flattened after each edit, so inspect persisted pixels
    // rather than requiring their vector stroke arrays to remain populated.
    saved=await save();
    const active=panelOf(saved).layers[0];
    if(kind==='vector'){
      assert.equal(active.strokes.length,2,'Immediate-release Vector strokes must both persist');
    }else{
      assert(active.image&&active.image.startsWith('data:image/png'),'Immediate-release Bitmap strokes must persist in a flattened image');
    }
  }

  // The desktop can lose pointer capture during a gesture. Keep the last valid
  // brush geometry instead of dropping the entire unfinished stroke.
  const interrupted=makeProject('Interrupted gesture retention');
  await load(interrupted);
  await choose('brush (B)');
  const interruptedStart=await at(.15,.2),interruptedEnd=await at(.47,.2);
  await page.mouse.move(interruptedStart.x,interruptedStart.y);
  await page.mouse.down();
  await page.mouse.move(interruptedEnd.x,interruptedEnd.y,{steps:8});
  await page.locator('.art-interaction').evaluate(el=>el.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'})));
  await page.mouse.up();
  saved=await save();
  assert.equal(panelOf(saved).layers[0].strokes.length,1,'Interrupted Brush gesture must preserve last sampled stroke');

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
    {id:uid(),tool:'brush',color:'#172b43',size:40,points:[[300,300,1],[500,300,1]],contours:[contourFromPoints([[300,300,1],[500,300,1]],40)]}
  ];
  await load(edit);
  await choose('Pencil Editor');
  await selectAt(960/1920,560/1080);
  await dragHandle('[data-mode=point][data-index="1"]',0,35);
  // Repeat the point gesture immediately, without saving or reloading in between.
  const secondHandle=await page.locator('[data-mode=point][data-index="1"]').first().boundingBox();
  assert(secondHandle,'Pencil Editor handle remains available for a second move');
  await dragHandle('[data-mode=point][data-index="1"]',0,25);
  saved=await save();
  assert(panelOf(saved).layers[0].strokes[0].points[1][1]>585,'Both consecutive Pencil Editor point movements persist');
  await load(saved);
  assert.deepEqual(panelOf(await save()).layers[0].strokes[0].points,panelOf(saved).layers[0].strokes[0].points);

  // Fast release: move only at pointer-up; no intermediate pointermove is required
  // for the final point coordinate to be committed.
  await load(edit);
  await choose('Pencil Editor');
  await selectAt(960/1920,560/1080);
  const fastHandle=await page.locator('[data-mode=point][data-index="1"]').first().boundingBox();
  assert(fastHandle,'Fast-release Pencil point handle must exist');
  await page.mouse.move(fastHandle.x+fastHandle.width/2,fastHandle.y+fastHandle.height/2);
  await page.mouse.down();
  await page.locator('.art-interaction').evaluate((el,pos)=>{
    el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,clientX:pos.x,clientY:pos.y}));
  },{x:fastHandle.x+fastHandle.width/2,y:fastHandle.y+fastHandle.height/2+42});
  await page.mouse.up();
  saved=await save();
  assert(panelOf(saved).layers[0].strokes[0].points[1][1]>560,'Pencil point release must commit the final coordinate without pointermove');

  // Verify that pointer cancellation cannot revert an already moved Pencil point.
  await load(edit);
  await choose('Pencil Editor');
  await selectAt(960/1920,560/1080);
  const interruptedPoint=await page.locator('[data-mode=point][data-index="1"]').first().boundingBox();
  assert(interruptedPoint,'Pencil point handle must exist before interrupted drag');
  await page.mouse.move(interruptedPoint.x+interruptedPoint.width/2,interruptedPoint.y+interruptedPoint.height/2);
  await page.mouse.down();
  await page.mouse.move(interruptedPoint.x+interruptedPoint.width/2,interruptedPoint.y+interruptedPoint.height/2+45,{steps:9});
  await page.locator('.art-interaction').evaluate(el=>el.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'})));
  await page.mouse.up();
  saved=await save();
  assert(panelOf(saved).layers[0].strokes[0].points[1][1]>560,'Interrupted Pencil Editor drag preserves moved point');
  await load(saved);
  assert.deepEqual(panelOf(await save()).layers[0].strokes[0].points,panelOf(saved).layers[0].strokes[0].points);

  // Continue with the contour test on the original editor fixture.
  await load(edit);
  await choose('Contour Editor');
  // Hit testing can land between contour vertices at different CI render scales.
  // Try actual nearby stroke coordinates, and require an editable point before dragging.
  const contourCandidates=[[400,300],[390,300],[410,300],[350,300],[450,300]];
  let contourSelected=false;
  for(const [x,y] of contourCandidates){
    // The interaction canvas includes a 25% drawing margin on every side.
    // Convert project coordinates into the extended canvas viewport before clicking.
    await selectAt((x/1920+0.25)/1.5,(y/1080+0.25)/1.5);
    if(await page.locator('[data-mode=point][data-index="1"]').count()){
      contourSelected=true;
      break;
    }
  }
  if(!contourSelected){
    const diagnostics={
      hint:await page.locator('.stage-hint').allTextContents(),
      tool:await page.locator('.art-interaction').getAttribute('class'),
      mode:await page.getByLabel('Selection mode',{exact:true}).inputValue(),
      points:await page.locator('[data-mode=point]').count(),
      canvas:await page.getByLabel('Drawing canvas',{exact:true}).boundingBox(),
      stage:await page.locator('.stage-paper').boundingBox(),
      strokes:panelOf(await save()).layers.map(l=>({kind:l.kind,visible:l.visible,locked:l.locked,strokes:l.strokes.map(t=>({tool:t.tool,points:t.points,contourCount:t.contours?.length}))}))
    };
    console.error('Contour Editor selection diagnostics:',JSON.stringify(diagnostics));
  }
  assert(contourSelected,'Contour Editor must expose point handles for the brush stroke');
  const original=panelOf(await save()).layers[0].strokes[1].contours[0];
  await dragHandle('[data-mode=point][data-index="1"]',0,35);
  saved=await save();
  assert.notDeepEqual(panelOf(saved).layers[0].strokes[1].contours[0],original,'Contour movement persisted');
  await load(saved);
  assert.deepEqual(panelOf(await save()).layers[0].strokes[1].contours,panelOf(saved).layers[0].strokes[1].contours);

  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('PASS Round 1 reliability: burst, interrupted, and consecutive Brush/Pencil strokes, repeat erasers, text resize, Pencil and Contour point movement, and save/reopen.');
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
