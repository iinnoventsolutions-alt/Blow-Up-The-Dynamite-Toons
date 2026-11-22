// PT.1 algorithm + project baseline. No production application behavior changes.
import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {floodMask,maskContours} from '../src/flood.ts';
import {serializeProject,parseProject} from '../src/project-format.js';
import {fixture} from './pt1-fixtures.mjs';
const repeats=Number(process.env.PT1_REPEATS||30);
if(!Number.isInteger(repeats)||repeats<5||repeats>1000)throw Error('PT1_REPEATS must be 5..1000');
const summary=arr=>{const a=[...arr].sort((x,y)=>x-y);return {medianMs:+a[Math.floor(a.length/2)].toFixed(3),p95Ms:+a[Math.ceil(a.length*.95)-1].toFixed(3),maxMs:+a.at(-1).toFixed(3)};};
const results={metadata:{date:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,cpus:os.cpus().length,repeats,commit:process.env.GITHUB_SHA||process.env.PT1_COMMIT||'local-unrecorded'},fill:[],projects:[]};
function pixels(w,h,scenario){
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;
  const border=x<12||y<12||x>=w-12||y>=h-12;
  const nested=scenario==='nested'&&x>w/3&&x<w*2/3&&(Math.abs(y-h/3)<3||Math.abs(y-h*2/3)<3);
  const dense=scenario==='dense'&&((x%113)<3||(y%97)<3);
  const wall=border||nested||dense;
  data[i]=data[i+1]=data[i+2]=wall?0:255;data[i+3]=255;
 }
 return data;
}
for(const [name,w,h,gap] of [['simple',256,144,0],['moderate',640,360,1],['complex',960,540,2],['dense',640,360,1],['nested',640,360,0]]){
 const source=pixels(w,h,name);const maskTimes=[],contourTimes=[];let mask,contours;
 for(let k=0;k<repeats+5;k++){
  let t=performance.now();mask=floodMask(source,w,h,Math.floor(w/4),Math.floor(h/4),0,gap);const m=performance.now()-t;
  t=performance.now();contours=maskContours(mask,w,h,1920/w,1080/h);const c=performance.now()-t;
  if(k>=5){maskTimes.push(m);contourTimes.push(c);}
 }
 const digest=createHash('sha256').update(mask).digest('hex');
 results.fill.push({name,dimensions:[w,h],gap,mask:summary(maskTimes),contours:summary(contourTimes),maskSha256:digest,contourCount:contours.length});
}
for(const count of [1,10,25,50]){
 const p=fixture(count),serializeTimes=[],parseTimes=[];let raw;
 for(let k=0;k<repeats+5;k++){
  let t=performance.now();raw=serializeProject(p);const s=performance.now()-t;
  t=performance.now();const restored=parseProject(raw);const d=performance.now()-t;
  if(restored.scenes.reduce((n,s)=>n+s.panels.length,0)!==count)throw Error('Panel count changed');
  if(k>=5){serializeTimes.push(s);parseTimes.push(d);}
 }
 results.projects.push({panels:count,bytes:Buffer.byteLength(raw),serialize:summary(serializeTimes),parse:summary(parseTimes),sha256:createHash('sha256').update(raw).digest('hex')});
}
const dir=resolve(process.env.PT1_OUTPUT||'benchmark-results');await mkdir(dir,{recursive:true});
const file=resolve(dir,'pt1-baseline-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
await writeFile(file,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));console.log('Wrote '+file);
