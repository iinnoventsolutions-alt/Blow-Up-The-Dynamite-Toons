import test from 'node:test';
import assert from 'node:assert/strict';
import {maskContours} from '../src/flood.ts';
import type {Point} from '../src/model.ts';

// Frozen pre-4.3B.3 contour tracer for exact coordinate and ordering parity.
function originalMaskContours(mask: Uint8Array,width:number,height:number,scaleX:number,scaleY:number):Point[][] {
 const edges=new Map<number,number[]>(),stride=width+1;const add=(a:number,b:number)=>{const list=edges.get(a)||[];list.push(b);edges.set(a,list);};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(!mask[i])continue;const a=y*stride+x;if(y===0||!mask[i-width])add(a,a+1);if(x===width-1||!mask[i+1])add(a+1,a+stride+1);if(y===height-1||!mask[i+width])add(a+stride+1,a+stride);if(x===0||!mask[i-1])add(a+stride,a);}
 const paths:Point[][]=[];let total=0;
 while(edges.size){const first=edges.keys().next().value!;let current=first;const path:Point[]=[];let guard=0;
 do{path.push([(current%stride)*scaleX,Math.floor(current/stride)*scaleY,1]);const list=edges.get(current);if(!list?.length)break;const next=list.pop()!;if(!list.length)edges.delete(current);current=next;if(++guard>1000000)throw new Error('Fill boundary is too complex. Reduce detail or tolerance.');}while(current!==first);
 const simple=path.filter((p,i)=>{const a=path[(i+path.length-1)%path.length],b=path[(i+1)%path.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0]);});
 if(simple.length>=3){total+=simple.length;if(total>100000)throw new Error('Fill boundary is too complex. Reduce detail or tolerance.');paths.push(simple);}
 }
 return paths;
}

let state=0x5a17c3d9;
const nextRandom=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
function verify(mask:Uint8Array,w:number,h:number){
 const backup=mask.slice();
 for(const [sx,sy] of [[1,1],[.5,2],[1.25,.75]]){
  let expected:Point[][]|undefined,actual:Point[][]|undefined,expectedError='',actualError='';
  try{expected=originalMaskContours(mask,w,h,sx,sy);}catch(e){expectedError=String(e);}
  try{actual=maskContours(mask,w,h,sx,sy);}catch(e){actualError=String(e);}
  assert.equal(actualError,expectedError,'Error behavior must match original');
  assert.deepEqual(actual,expected,`Contour mismatch size=${w}x${h} scale=${sx},${sy}`);
 }
 assert.deepEqual(mask,backup,'Contour tracing must not mutate the input mask');
}
test('4.3B.3 exact contour parity: empty, solid, corners, diagonal junctions and holes',()=>{
 for(const [w,h] of [[1,1],[2,2],[3,3],[8,8],[17,13],[64,48]]){
  for(let mode=0;mode<9;mode++){
   const mask=new Uint8Array(w*h);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;
    mask[i]=+(mode===0?false:mode===1?true:mode===2?(x+y)%2===0:
     mode===3?x%2===0:mode===4?y%2===0:mode===5?(x===0||y===0||x===w-1||y===h-1):
     mode===6?(x>1&&x<w-2&&y>1&&y<h-2&&!(x>3&&x<w-4&&y>3&&y<h-4)):
     mode===7?(x===y||x+y===w-1):((nextRandom()&7)<3));
   }
   verify(mask,w,h);
  }
 }
});
test('4.3B.3 exact contour parity: deterministic randomized dense and sparse masks',()=>{
 for(const [w,h] of [[5,7],[19,23],[80,48]]){
  for(const threshold of [1,2,4,7]){
   for(let iteration=0;iteration<8;iteration++){
    const mask=new Uint8Array(w*h);
    for(let i=0;i<mask.length;i++)mask[i]=+((nextRandom()&7)<threshold);
    verify(mask,w,h);
   }
  }
 }
});
