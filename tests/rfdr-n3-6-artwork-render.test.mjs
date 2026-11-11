import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';

test('N3.6 isolated real artwork pixels match accepted playback for camera and dissolve',async()=>{
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4396','--strictPort'],{stdio:'ignore'});
 let browser;
 try{
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4396')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  assert(ready,'Vite test server did not start');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4396');
  const result=await page.evaluate(async()=>{
   const {renderIsolatedProjectFrame}=await import('/src/deterministic-artwork-renderer.ts');
   const {paintPlayback}=await import('/src/playback-render.ts');
   const panel=(id,color)=>({id,name:id,duration:4,dialogue:'',action:'',slugging:'',notes:'',layers:[{id:'layer-'+id,name:'Layer',visible:true,locked:false,opacity:1,strokes:[{id:'shape-'+id,tool:'shape',shape:'rectangle',color,size:1,fill:color,points:[[0,0,1],[100,100,1]]}]}]});
   const p={format:'innovent-storyboard',schemaVersion:5,id:'test',title:'test',subtitle:'',width:100,height:100,fps:24,
    scenes:[{id:'scene',name:'Scene',camera:[],panels:[panel('a','#ff0000'),panel('b','#0000ff')],sequentialCamera:{version:1,baseline:{x:50,y:50,zoom:1,rotation:0},panels:{a:{mode:'animated',keys:[{frame:3,x:10,y:0,zoom:1,rotation:15,interpolation:'linear'}]}}}}],
    transitions:[{id:'d',fromId:'a',toId:'b',type:'dissolve',duration:3,direction:'right'}],audioAssets:[],audioTracks:[]};
   const original=JSON.stringify(p);
   const samples=[];
   for(const i of [0,1,2,3,4,7]){
    const out=await renderIsolatedProjectFrame(p,i,{width:100});
    const canvas=document.createElement('canvas');paintPlayback(canvas,p,i,100,[]);
    const expected=canvas.getContext('2d').getImageData(0,0,100,100).data;
    samples.push({index:i,equal:out.pixels.length===expected.length&&out.pixels.every((v,n)=>v===expected[n]),stamp:out.timestampUs,center:[...out.pixels.slice((50*100+50)*4,(50*100+50)*4+4)]});
   }
   const controller=new AbortController();controller.abort();
   let cancelled=false;try{await renderIsolatedProjectFrame(p,0,{signal:controller.signal});}catch(e){cancelled=e.name==='AbortError';}
   let invalid=false;try{await renderIsolatedProjectFrame(p,8);}catch(e){invalid=e instanceof RangeError;}
   return {samples,cancelled,invalid,unchanged:JSON.stringify(p)===original};
  });
  assert(result.samples.every(s=>s.equal),'Every isolated frame must be pixel-identical to production playback');
  assert.deepEqual(result.samples.map(s=>s.stamp),[0,41667,83333,125000,166667,291667]);
  assert.deepEqual(result.samples[0].center,[255,0,0,255]);
  assert.deepEqual(result.samples[4].center,[0,0,255,255]);
  assert(result.cancelled&&result.invalid&&result.unchanged);
 }finally{await browser?.close();server.kill();}
});
