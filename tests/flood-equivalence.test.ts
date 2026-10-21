import test from 'node:test';
import assert from 'node:assert/strict';
import {floodMask,maskContours} from '../src/flood.ts';

// Frozen pre-4.3B.2 mask algorithm: compare actual output byte-for-byte.
function referenceFloodMask(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, tolerance: number, gap: number): Uint8Array {
 x=Math.max(0,Math.min(width-1,Math.floor(x)));y=Math.max(0,Math.min(height-1,Math.floor(y)));const seed=(y*width+x)*4,n=width*height;
 let wall=new Uint8Array(n);for(let i=0;i<n;i++){const k=i*4;const alpha=data[k+3],a=data[seed+3];const difference=Math.max(Math.abs(alpha-a),Math.abs(data[k]*alpha/255-data[seed]*a/255),Math.abs(data[k+1]*alpha/255-data[seed+1]*a/255),Math.abs(data[k+2]*alpha/255-data[seed+2]*a/255));wall[i]=difference>tolerance?1:0;}
 // Close small openings in the boundary mask before filling; retain original artwork.
 for(let pass=0;pass<gap;pass++){const out=wall.slice();for(let yy=1;yy<height-1;yy++)for(let xx=1;xx<width-1;xx++){const i=yy*width+xx;out[i]=wall[i]||wall[i-1]||wall[i+1]||wall[i-width]||wall[i+width]||wall[i-width-1]||wall[i-width+1]||wall[i+width-1]||wall[i+width+1]?1:0;}wall=out;}
 for(let pass=0;pass<gap;pass++){const out=wall.slice();for(let yy=1;yy<height-1;yy++)for(let xx=1;xx<width-1;xx++){const i=yy*width+xx;out[i]=wall[i]&&wall[i-1]&&wall[i+1]&&wall[i-width]&&wall[i+width]&&wall[i-width-1]&&wall[i-width+1]&&wall[i+width-1]&&wall[i+width+1]?1:0;}wall=out;}
 const mask=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0,index=y*width+x;if(wall[index])return mask;mask[index]=1;queue[tail++]=index;
 // Avoid allocating a neighbor array for every visited pixel.
 // Every pixel enters the queue at most once because it is marked on enqueue.
 while(head<tail){
  const i=queue[head++],xx=i%width;
  let j=i-1;
  if(xx>0&&!mask[j]&&!wall[j]){mask[j]=1;queue[tail++]=j;}
  j=i+1;
  if(xx<width-1&&!mask[j]&&!wall[j]){mask[j]=1;queue[tail++]=j;}
  j=i-width;
  if(j>=0&&!mask[j]&&!wall[j]){mask[j]=1;queue[tail++]=j;}
  j=i+width;
  if(j<n&&!mask[j]&&!wall[j]){mask[j]=1;queue[tail++]=j;}
 }
 return mask;
}

let seed=0x189372ad;
function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;}
function pixels(w:number,h:number,kind:number){
 const data=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++){
  const x=i%w,y=Math.floor(i/w),k=i*4;
  if(kind===0){data[k]=Math.floor(random()*256);data[k+1]=Math.floor(random()*256);data[k+2]=Math.floor(random()*256);data[k+3]=Math.floor(random()*256);}
  else if(kind===1){data[k]=x*13%256;data[k+1]=y*19%256;data[k+2]=(x+y)*7%256;data[k+3]=255;}
  else if(kind===2){data[k]=data[k+1]=data[k+2]=0;data[k+3]=x===2||x===w-3||y===2||y===h-3?255:0;}
  else {data[k]=Math.floor(random()*256);data[k+1]=0;data[k+2]=255;data[k+3]=i%5===0?0:255;}
 }
 return data;
}
test('4.3B.2 optimized flood masks match the original byte-for-byte with varied alpha tolerance and gap',()=>{
 for(const [w,h] of [[1,1],[2,3],[5,7],[13,11],[32,24],[65,33]]){
  for(let kind=0;kind<4;kind++){
   const data=pixels(w,h,kind);
   for(const tolerance of [0,1,15,40,120,255]){
    for(const gap of [0,1,2,3]){
     for(const [x,y] of [[0,0],[Math.floor(w/2),Math.floor(h/2)],[w-1,h-1]]){
      const actual=floodMask(data,w,h,x,y,tolerance,gap);
      const expected=referenceFloodMask(data,w,h,x,y,tolerance,gap);
      assert.deepEqual(actual,expected,`dimensions=${w}x${h} kind=${kind} tolerance=${tolerance} gap=${gap} seed=${x},${y}`);
     }
    }
   }
  }
 }
});
test('4.3B.2 retains hole contour parity and does not mutate source pixels',()=>{
 const w=48,h=36,data=pixels(w,h,2),before=data.slice();
 for(const tolerance of [0,10,200])for(const gap of [0,1,2]){
  const original=referenceFloodMask(data,w,h,Math.floor(w/2),Math.floor(h/2),tolerance,gap);
  const optimized=floodMask(data,w,h,Math.floor(w/2),Math.floor(h/2),tolerance,gap);
  assert.deepEqual(maskContours(optimized,w,h,1,1),maskContours(original,w,h,1,1));
 }
 assert.deepEqual(data,before);
});
