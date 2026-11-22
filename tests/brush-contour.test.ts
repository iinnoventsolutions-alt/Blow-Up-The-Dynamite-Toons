import test from 'node:test';
import assert from 'node:assert/strict';
import { contourFromPoints } from '../src/artwork.ts';
import type { Point } from '../src/model.ts';

test('brush contour does not produce long spikes at repeated W-shaped sharp turns', () => {
 const points: Point[] = [[10,85,1],[25,12,1],[40,85,1],[55,18,1],[70,85,1],[85,10,1],[100,85,1]];
 const size=12;
 const contour=contourFromPoints(points,size);
 assert.ok(contour.length > points.length*2);
 assert.ok(contour.every(p => p.every(Number.isFinite)));
 for (const p of contour) {
  const nearest=Math.min(...points.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1])));
  const nearestSegment=Math.min(...points.slice(1).map((q,i)=>{
   const a=points[i],dx=q[0]-a[0],dy=q[1]-a[1];
   const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
   return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
  }));
  assert.ok(Math.min(nearest,nearestSegment)<=size*.75, 'Brush outline must stay close to its centerline');
 }
});

test('brush outline remains finite on a sharp reversal and single point', () => {
 for(const points of [ [[30,30,1]] as Point[], [[20,20,1],[50,20,1],[20,20,1],[50,20,1]] as Point[] ]) {
  const contour=contourFromPoints(points,10);
  assert.ok(contour.length>=16);
  assert.ok(contour.every(p=>p.every(Number.isFinite)));
 }
});
