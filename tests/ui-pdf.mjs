import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {makeProject,makePanel,makeScene,uid} from '../src/model.ts';
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4317')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const p=makeProject('PDF acceptance — café','1920'*1,1080,24,'Export and branding review');
p.scenes[0].name='PDF_SCENE_HEADING';p.scenes[0].panels[0].name='PDF_PANEL_HEADING';
const first=p.scenes[0].panels[0];first.dialogue='MAYA\nIntroduction — café and naïve.\nA new story begins.';first.action='Camera moves toward the subject.';first.notes='NOTES_SENTINEL';first.slugging='SLUG_SENTINEL';
first.layers[0].strokes=[{id:uid(),tool:'shape',shape:'rectangle',fill:'#76b3dc',color:'#172b43',size:4,points:[[200,200,1],[1700,900,1]]}];
first.layers.push({id:uid(),name:'Hidden',visible:false,locked:false,opacity:1,strokes:[{id:uid(),tool:'shape',shape:'rectangle',fill:'#ff0000',color:'#ff0000',size:1,points:[[0,0,1],[1920,1080,1]]}]});
p.scenes[0].camera=[{id:uid(),frame:0,x:960,y:540,zoom:1,rotation:0,interpolation:'linear'},{id:uid(),frame:119,x:2400,y:540,zoom:1.5,rotation:20,interpolation:'ease'}];
p.scenes[0].panels.push(makePanel('Panel 2'));p.scenes[0].panels[1].dialogue=Array.from({length:80},(_,i)=>'LINE_'+String(i).padStart(3,'0')+' Dialogue continues without clipping.').join('\n')+'\nFINAL_CAPTION_SENTINEL';
p.scenes.push(makeScene('Scene 2'),{...makeScene('Empty scene'),panels:[]});p.scenes[1].panels[0].notes='SECOND_SCENE_SENTINEL';
p.transitions.push({id:uid(),fromId:first.id,toId:p.scenes[0].panels[1].id,type:'dissolve',duration:12,direction:'right'});
const python=process.env.PYTHON || (['python3','python'].find(command=>{try{execFileSync(command,['--version'],{stdio:'ignore'});return true;}catch{return false;}}));
if(!python)throw new Error('PDF tests require Python 3. Install Python 3 or set PYTHON to its executable path.');
const exportPdf=async name=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export PDF',exact:true}).last().click();const d=await pending;assert(d.suggestedFilename().endsWith('.pdf'));const path='test-results/'+name+'.pdf';await d.saveAs(path);execFileSync(python,['tests/pdf-format-check.py',path]);const text=execFileSync('pdftotext',['-layout',path,'-'],{encoding:'utf8'});const info=execFileSync('pdfinfo',[path],{encoding:'utf8'});assert.match(info,/Pages:\s+\d+/);return {text,info,path};};
const label=(name)=>page.getByLabel(name,{exact:true});
try{
 await mkdir('test-results',{recursive:true});await page.goto('http://127.0.0.1:4317');await page.locator('input[type=file]').first().setInputFiles({name:'PDF.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});
 await page.getByRole('button',{name:'Export PDF',exact:true}).click();await page.getByRole('heading',{name:'Export storyboard PDF'}).waitFor();
 await page.getByRole('button',{name:'Preview PDF',exact:true}).click();await page.getByText(/pages · 3 panels/).waitFor();await page.getByRole('button',{name:'Export PDF',exact:true}).last().waitFor({state:'visible'});await page.screenshot({path:'test-results/pdf-dialog.png'});
 const a=await exportPdf('pdf-vertical');assert.match(a.text,/FINAL_CAPTION_SENTINEL/);for(let i=0;i<80;i++)assert(a.text.includes('LINE_'+String(i).padStart(3,'0')));assert.match(a.text,/cont\./);assert.match(a.text,/NOTES_SENTINEL/);assert.match(a.text,/Transition/);assert.match(a.text,/dissolve · right/);assert.match(a.text,/café/);assert.match(a.text,/SECOND_SCENE_SENTINEL/);assert.match(a.info,/612 x 792/);
 await label('Saved PDF profile').selectOption('1');assert.equal(await page.locator('.pdf-preview-stale').evaluate(e=>getComputedStyle(e).color),'rgb(255, 119, 119)');const b=await exportPdf('pdf-horizontal');assert.match(b.info,/792 x 612/);assert.equal(await page.locator('.pdf-preview-stale').count(),0);assert.match(b.text,/FINAL_CAPTION_SENTINEL/);
 await label('Saved PDF profile').selectOption('2');await label('PDF export range').selectOption('panel');await label('Cover page').uncheck();await label('PDF panel imagery').selectOption('camera');const c=await exportPdf('pdf-full');assert.match(c.info,/Pages:\s+[1-9]/);assert(!c.text.includes('FINAL_CAPTION_SENTINEL'));
 // A3: export camera movement from a copied panel and validate the resulting PDF.
 await label('PDF export range').selectOption('all');
 await label('PDF panel imagery').selectOption('movement');
 const cameraMovementPdf=await exportPdf('pdf-camera-movement');
 assert.match(cameraMovementPdf.info,/Pages:\s+[1-9]/,'Movement PDF is structurally valid');
 assert.match(cameraMovementPdf.text,/PDF_PANEL_HEADING/,'Movement export retains panel identification');
 await label('Saved PDF profile').selectOption('3');await label('PDF export range').selectOption('all');await label('PDF paper').selectOption('a4');await label('Start each scene on a new page').check();await label('PDF panel imagery').selectOption('artwork');const d=await exportPdf('pdf-overview');assert.match(d.info,/841.89 x 595.28/);assert.match(d.text,/FINAL_CAPTION_SENTINEL/);
 await label('PDF export range').selectOption('scenes');assert(await page.getByRole('button',{name:'Export PDF',exact:true}).last().isDisabled());await label('Scene 2 (1)').check();await label('Cover page').uncheck();await label('Notes').uncheck();const e=await exportPdf('pdf-range');assert(!e.text.includes('NOTES_SENTINEL'));assert(!e.text.includes('SECOND_SCENE_SENTINEL'));assert(!e.text.includes('LINE_'));
 await page.getByRole('button',{name:'Duplicate profile',exact:true}).click();await label('PDF profile name').fill('Saved review');await label('PDF margin').fill('36');await page.getByRole('button',{name:'Save profile',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Export PDF',exact:true}).click();await label('Saved PDF profile').selectOption('4');assert.equal(await label('PDF margin').inputValue(),'36');
 await page.getByRole('button',{name:'Delete profile',exact:true}).click();assert.equal(await label('Saved PDF profile').locator('option').count(),4);
 const closeStarted=performance.now();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('heading',{name:'Export storyboard PDF'}).waitFor({state:'detached'});
 console.log('PDF dialog close response (browser, informational): '+(performance.now()-closeStarted).toFixed(1)+'ms');
 const save=page.waitForEvent('download');await page.getByRole('button',{name:'Save project',exact:true}).click();const saved=JSON.parse(await readFile(await(await save).path(),'utf8'));assert.deepEqual(saved,p,'PDF export does not mutate the project');

 // Branding replacement, selected panels, 300 DPI, cancellation and unsupported glyph feedback.
 await page.getByRole('button',{name:'Panel',exact:true}).click();
 await page.locator('.grid-card input[type=checkbox]').first().check();
 await page.getByRole('button',{name:'Export PDF',exact:true}).click();await label('PDF export range').selectOption('selected');
 await label('Cover page').uncheck();await label('PDF artwork DPI').selectOption('300');await label('PDF template').selectOption('overview');await label('PDF orientation').selectOption('landscape');await label('PDF caption size').fill('14');await label('PDF margin').fill('54');
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=40;const x=c.getContext('2d');x.fillStyle='#f08020';x.fillRect(0,0,80,40);return c.toDataURL().split(',')[1];});
 await label('Company PDF logo').setInputFiles({name:'company.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await label('PDF profile name').fill('Custom logo');await page.getByRole('button',{name:'Save profile',exact:true}).click();
 const selected=await exportPdf('pdf-branding');assert(!selected.text.includes('FINAL_CAPTION_SENTINEL'));
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.reload();await page.locator('input[type=file]').first().setInputFiles({name:'PDF.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});
 await page.getByRole('button',{name:'Export PDF',exact:true}).click();assert.equal(await label('PDF profile name').inputValue(),'Custom logo');assert((await page.locator('.pdf-logo-swatch').getAttribute('src')).startsWith('data:image/png'));
 await label('PDF export range').selectOption('all');await page.getByRole('button',{name:'Preview PDF',exact:true}).click();await page.getByRole('button',{name:'Cancel export',exact:true}).click();await page.getByRole('alert').filter({hasText:'cancelled'}).waitFor();
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Drawing',exact:true}).click();await label('dialogue').fill('Unsupported glyph: 😀');await page.getByRole('button',{name:'Export PDF',exact:true}).click();await page.getByRole('button',{name:'Preview PDF',exact:true}).click();await page.getByRole('alert').filter({hasText:'does not support'}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS PDF: four layouts, searchable Unicode captions, long-caption continuation, ranges, scene breaks, profiles, preview, camera modes, and unchanged project.');
}catch(e){console.error(errors);await page.screenshot({path:'test-results/pdf-failure.png'});throw e;}finally{await browser.close();server.kill();}
