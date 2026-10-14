import test from 'node:test';
import assert from 'node:assert/strict';
import { drawingPoint } from '../src/drawing-coordinates.ts';
test('canvas-derived mapping inverts pan, rotation and fractional zoom without SVG matrices',()=>{
 for(const [width,height] of [[1920,1080],[1080,1920],[8192,1211]])for(const zoom of [1,1.75,3])for(const rotation of [0,25,45,90,-135]){
  const w=600*zoom,h=w*height/width,c=Math.cos(rotation*Math.PI/180),s=Math.sin(rotation*Math.PI/180),bw=Math.abs(c)*w+Math.abs(s)*h,bh=Math.abs(s)*w+Math.abs(c)*h,rect={left:700-bw/2,top:500-bh/2,width:bw,height:bh};
  for(const [x,y] of [[.2,.3],[.55,.52],[.8,.7]]){const dx=(x-.5)*w,dy=(y-.5)*h,p=drawingPoint(700+dx*c-dy*s,500+dx*s+dy*c,rect,width/height,rotation,width,height);assert(Math.abs(p.x-x*width)<1e-8);assert(Math.abs(p.y-y*height)<1e-8);}
 }
});
