import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {floodMask} from '../src/flood.ts';
const project=JSON.parse(readFileSync(new URL('../benchmark-results/fixtures/pt1-50-panels.issb',import.meta.url),'utf8'));
const panel=project.scenes[3].panels[4];
const rectangle=panel.layers.flatMap(l=>l.strokes).find(s=>s.id==='pt1_2564');
test('Panel 35 closed rectangle is present in deterministic fixture',()=>{
 assert.equal(panel.name,'Panel 35');assert.ok(rectangle);
 assert.deepEqual(rectangle.points,[[190,183,1],[358,183,1],[358,264,1],[190,264,1],[190,183,1]]);
});
const pixels=(w,h)=>new Uint8ClampedArray(w*h*4);
function set(d,w,x,y,a=255){const k=(y*w+x)*4;d[k]=24;d[k+1]=40;d[k+2]=56;d[k+3]=a;}
function rect(w,h,opening=false,alpha=255){
 const d=pixels(w,h);
 for(let x=20;x<=160;x++){if(!opening||x!==90)set(d,w,x,20,alpha);set(d,w,x,100,alpha);}
 for(let y=20;y<=100;y++){set(d,w,20,y,alpha);set(d,w,160,y,alpha);}
 return d;
}
const area=m=>m.reduce((n,v)=>n+v,0);
test('opaque closed rectangle contains transparent-interior fill with gap 0 through 3',()=>{
 const w=220,h=140,d=rect(w,h);
 for(const gap of [0,1,2,3]){
  const mask=floodMask(d,w,h,60,60,20,gap);
  assert.ok(area(mask)>0&&area(mask)<140*80,'Unexpected filled area for gap '+gap);
  assert.equal(mask[10*w+10],0);
 }
});
test('one-pixel opening connects rectangle interior to exterior at gap zero',()=>{
 const w=220,h=140,d=rect(w,h,true);
 assert.equal(floodMask(d,w,h,60,60,20,0)[10*w+10],1);
});
test('faint opaque boundary below tolerance is traversable',()=>{
 const w=220,h=140,d=rect(w,h,false,12);
 assert.equal(floodMask(d,w,h,60,60,20,0)[10*w+10],1);
});
test('opaque closed boundary separates identical transparent interior and exterior',()=>{
 const w=220,h=140,d=rect(w,h);
 assert.equal(floodMask(d,w,h,60,60,0,0)[10*w+10],0);
 assert.equal(floodMask(d,w,h,10,10,0,0)[60*w+60],0);
});
