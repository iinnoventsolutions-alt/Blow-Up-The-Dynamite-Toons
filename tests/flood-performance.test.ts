import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {floodMask} from '../src/flood.ts';

// Reference implementation retained in tests only to lock existing fill semantics.
function reference(data:Uint8ClampedArray,width:number,height:number,x:number,y:number,tolerance:number,gap:number){
 x=Math.max(0,Math.min(width-1,Math.floor(x)));y=Math.max(0,Math.min(height-1,Math.floor(y)));
 const seed=(y*width+x)*4,n=width*height;let wall=new Uint8Array(n);
 for(let i=0;i<n;i++){const k=i*4,alpha=data[k+3],a=data[seed+3];const difference=Math.max(Math.abs(alpha-a),Math.abs(data[k]*alpha/255-data[seed]*a/255),Math.abs(data[k+1]*alpha/255-data[seed+1]*a/255),Math.abs(data[k+2]*alpha/255-data[seed+2]*a/255));wall[i]=difference>tolerance?1:0;}
 for(let pass=0;pass<gap;pass++){const out=wall.slice();for(let yy=1;yy<height-1;yy++)for(let xx=1;xx<width-1;xx++){const i=yy*width+xx;out[i]=wall[i]||wall[i-1]||wall[i+1]||wall[i-width]||wall[i+width]||wall[i-width-1]||wall[i-width+1]||wall[i+width-1]||wall[i+width+1]?1:0;}wall=out;}
 for(let pass=0;pass<gap;pass++){const out=wall.slice();for(let yy=1;yy<height-1;yy++)for(let xx=1;xx<width-1;xx++){const i=yy*width+xx;out[i]=wall[i]&&wall[i-1]&&wall[i+1]&&wall[i-width]&&wall[i+width]&&wall[i-width-1]&&wall[i-width+1]&&wall[i+width-1]&&wall[i+width+1]?1:0;}wall=out;}
 const mask=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0,index=y*width+x;
 if(wall[index])return mask;mask[index]=1;queue[tail++]=index;
 while(head<tail){const i=queue[head++],xx=i%width;for(const j of [xx?i-1:-1,xx<width-1?i+1:-1,i>=width?i-width:-1,i<n-width?i+width:-1])if(j>=0&&!mask[j]&&!wall[j]){mask[j]=1;queue[tail++]=j;}}
 return mask;
}
test('optimized flood mask preserves existing fill semantics across sizes, tolerance and gap',()=>{
 let seed=0x12345678;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed&255;};
 for(const [width,height] of [[1,1],[2,2],[17,19],[64,48],[137,91]]){
  const image=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<image.length;i++)image[i]=rand();
  for(const tolerance of [0,20,80,255])for(const gap of [0,1,2]){
   const x=Math.floor(rand()/256*width),y=Math.floor(rand()/256*height);
   const expected=reference(image,width,height,x,y,tolerance,gap);
   const actual=floodMask(image,width,height,x,y,tolerance,gap);
   assert.deepEqual(actual,expected,`Mismatch at ${width}×${height}, tolerance ${tolerance}, gap ${gap}`);
  }
 }
});
test('large contiguous bucket fill remains correct and reports an informational benchmark',()=>{
 const width=1024,height=1024,data=new Uint8ClampedArray(width*height*4);
 data.fill(255);
 const start=performance.now();const mask=floodMask(data,width,height,12,12,20,0);
 const elapsed=performance.now()-start;
 assert.equal(mask.length,width*height);
 assert.equal(mask.reduce((a,b)=>a+b,0),width*height);
 console.log('Bucket 1024×1024 flood-mask benchmark (Node, informational): '+elapsed.toFixed(1)+'ms');
});
