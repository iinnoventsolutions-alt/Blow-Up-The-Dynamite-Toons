import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

// E2.4-A1.2: isolated, non-gating drawing playback diagnosis.
// Test the actual paintPlayback path with a valid project fixture, and distinguish
// the known canvas-bounds clipping from the camera-visible artwork expectation.
const server=spawn(process.platform==='win32'?'node_modules/.bin/vite.cmd':'node_modules/.bin/vite',['--host','127.0.0.1','--port','4318','--strictPort'],{stdio:'ignore'});
let browser;
try {
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4318')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert(ready,'Vite diagnostic server started');
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:4318');
 const result=await page.evaluate(async()=>{
  const {makeProject}=await import('/src/model.ts');
  const {paintPlayback}=await import('/src/playback-render.ts');
  const {drawPanel}=await import('/src/render.ts');
  const project=makeProject('E2.4-A1.2 camera clipping',1920,1080,24);
  const scene=project.scenes[0],panel=scene.panels[0];
  const stroke={id:'e24-right-edge',tool:'shape',shape:'rectangle',fill:'#ff0000',color:'#ff0000',size:0,points:[[1950,400,1],[2100,600,1]]};
  panel.layers[0].strokes.push(stroke);
  scene.camera=[{id:'e24-camera',frame:0,x:1450,y:540,zoom:1,rotation:0,interpolation:'linear'}];
  const sample=(canvas,x,y)=>Array.from(canvas.getContext('2d').getImageData(x,y,1,1).data);
  // World x=2000 should map to screen x=1510 in a camera centered at 1450.
  const output=document.createElement('canvas');
  paintPlayback(output,project,0,1920,[]);
  const playback=sample(output,1510,500);
  const direct=document.createElement('canvas');
  drawPanel(direct,panel,project,{width:1920,camera:{x:1450,y:540,zoom:1,rotation:0}});
  const directPixel=sample(direct,1510,500);
  // In-bounds control shape must remain visible through identical camera pose.
  panel.layers[0].strokes[0]={...stroke,points:[[1650,400,1],[1750,600,1]]};
  const control=document.createElement('canvas');
  paintPlayback(control,project,0,1920,[]);
  const controlPixel=sample(control,1210,500);
  const variants=[];
  for(const pose of [{x:1450,y:540,zoom:1.5,rotation:0},{x:1450,y:540,zoom:1,rotation:25},{x:1450,y:540,zoom:1.5,rotation:25}]){
   panel.layers[0].strokes[0]=stroke;
   const frame=document.createElement('canvas'),comparison=document.createElement('canvas');
   scene.camera=[{...scene.camera[0],...pose}];
   paintPlayback(frame,project,0,1920,[]);
   drawPanel(comparison,panel,project,{width:1920,camera:pose});
   const rad=pose.rotation*Math.PI/180,dx=(2025-pose.x)*pose.zoom,dy=(500-pose.y)*pose.zoom;
   const sx=Math.round(960+dx*Math.cos(rad)+dy*Math.sin(rad)),sy=Math.round(540-dx*Math.sin(rad)+dy*Math.cos(rad));
   variants.push({pose,screen:[sx,sy],playback:sample(frame,sx,sy),direct:sample(comparison,sx,sy)});
  }
  return {variants,playback,direct:directPixel,inBoundsControl:controlPixel,coordinates:{worldX:2000,screenX:1510,cameraX:1450},canvas:{width:output.width,height:output.height}};
 });
 console.log('E2.4-A1.2 drawing playback camera pixels:',JSON.stringify(result));
 const red=p=>p[0]>200&&p[1]<50&&p[2]<50;
 assert(red(result.inBoundsControl),'Valid fixture control: in-bounds shape must paint red in playback');
 assert.deepEqual(result.playback,result.direct,'Playback and direct camera render must agree at the same camera pose');
 assert(red(result.playback),'Camera-visible artwork outside source drawing bounds must survive playback rendering');
 for(const v of result.variants){assert.deepEqual(v.playback,v.direct,'Camera zoom/rotation must agree between direct and playback render');assert(red(v.playback),'Camera-visible off-canvas artwork must survive zoom and rotation: '+JSON.stringify(v.pose));}
 console.log('PASS E2.4-A3 camera clipping across zoom and rotation');
}finally{await browser?.close();server.kill();}
