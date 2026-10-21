import type { Point } from './model.ts';
export function floodMask(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, tolerance: number, gap: number): Uint8Array {
 x=Math.max(0,Math.min(width-1,Math.floor(x)));y=Math.max(0,Math.min(height-1,Math.floor(y)));const seed=(y*width+x)*4,n=width*height;
 // Compute seed premultiplied colors once. Check the alpha channel first and
 // stop evaluating channels as soon as a pixel exceeds the tolerance.
 // Preserve the original multiplication/division order for exact mask parity.
 const seedAlpha=data[seed+3];
 const seedR=data[seed]*seedAlpha/255;
 const seedG=data[seed+1]*seedAlpha/255;
 const seedB=data[seed+2]*seedAlpha/255;
 let wall=new Uint8Array(n);
 for(let i=0;i<n;i++){
  const k=i*4,alpha=data[k+3];
  wall[i]=(
   Math.abs(alpha-seedAlpha)>tolerance ||
   Math.abs(data[k]*alpha/255-seedR)>tolerance ||
   Math.abs(data[k+1]*alpha/255-seedG)>tolerance ||
   Math.abs(data[k+2]*alpha/255-seedB)>tolerance
  )?1:0;
 }
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
export function maskContours(mask: Uint8Array,width:number,height:number,scaleX:number,scaleY:number):Point[][] {
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
