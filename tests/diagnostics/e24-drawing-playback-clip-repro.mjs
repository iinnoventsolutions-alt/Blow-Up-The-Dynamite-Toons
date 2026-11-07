import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

// E2.4-A1: isolated, deliberately failing reproduction. Not part of the gating suite.
// Artwork outside the source drawing bounds must remain visible when inside the camera frame.
const server=spawn(process.platform==='win32'?'node_modules/.bin/vite.cmd':'node_modules/.bin/vite',['--host','127.0.0.1','--port','4318','--strictPort'],{stdio:'ignore'});
let browser;
try {
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4318')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert(ready,'Vite diagnostic server started');
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:4318');
 const sample=await page.evaluate(async()=>{
  const {drawPanel}=await import('/src/render.ts');
  const project={width:1920,height:1080};
  const panel={layers:[{visible:true,opacity:1,strokes:[{tool:'shape',shape:'rectangle',fill:'#ff0000',color:'#ff0000',size:0,points:[[1950,400,1],[2100,600,1]]}]}]};
  const canvas=document.createElement('canvas');
  drawPanel(canvas,panel,project,{width:1920,camera:{x:1450,y:540,zoom:1,rotation:0}});
  // World x=2000 is inside the shifted camera viewport (output x=1510).
  const pixels=canvas.getContext('2d').getImageData(1510,500,1,1).data;
  return Array.from(pixels);
 });
 console.log('E2.4-A1 right-side in-camera pixel:',JSON.stringify(sample));
 assert(sample[0]>200&&sample[1]<50&&sample[2]<50,'Camera-visible right-side artwork must not be clipped to original drawing canvas');
 console.log('PASS E2.4-A1 camera-visible off-canvas artwork');
} finally {await browser?.close();server.kill();}
