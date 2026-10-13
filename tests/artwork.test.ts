import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProject,makeLayer,uid,type Stroke } from '../src/model.ts';
import { bounds,simplifyStroke,contourFromPoints,eligibleLayers,hitStroke,pointInPolygon,transformStroke,editSelected } from '../src/artwork.ts';
import { floodMask,maskContours } from '../src/flood.ts';
import { parseProject,serializeProject } from '../src/project-format.js';
test('legacy projects migrate as editable vector layers; schema 2 round trips all artwork types',()=>{
 const p=makeProject();const legacy=structuredClone(p) as unknown as {schemaVersion:number;scenes:typeof p.scenes};legacy.schemaVersion=1;delete legacy.scenes[0].panels[0].layers[0].kind;const migrated=parseProject(JSON.stringify(legacy));assert.equal(migrated.schemaVersion,2);assert.equal(migrated.scenes[0].panels[0].layers[0].kind,'vector');
 const layer=migrated.scenes[0].panels[0].layers[0];layer.strokes=[{id:uid(),tool:'brush',color:'#000000',size:10,points:[[10,10,1]],contours:[contourFromPoints([[10,10,1]],10)]},{id:uid(),tool:'pencil',color:'#ff0000',size:5,points:[[1,2,.5],[3,4,1]],texture:'graphite'},{id:uid(),tool:'shape',color:'#000000',size:2,points:[[10,20,1],[30,40,1]],shape:'rectangle',fill:'#ffff00'},{id:uid(),tool:'text',color:'#000000',size:1,points:[[1,2,1],[200,80,1]],text:'Hi',font:'Arial',fontSize:32,bold:false,italic:true,align:'left',tracking:0,lineSpacing:1.2}];assert.deepEqual(parseProject(serializeProject(migrated)),migrated);
});
test('brush outlines contain pressure-derived contours while pencil retains a centerline',()=>{
 const contour=contourFromPoints([[100,100,1],[200,100,.5]],20);assert(contour.length>=20);assert(pointInPolygon(110,100,contour));assert(!pointInPolygon(110,130,contour));
 const s:Stroke={id:uid(),tool:'pencil',color:'#000000',size:20,points:[[100,100,1],[200,100,.5]]};assert(hitStroke(s,130,102));assert(!hitStroke(s,130,170));const transformed=transformStroke(s,100,100,2,2,10,0);assert.equal(transformed.points[1][0],310);assert.equal(transformed.size,40);
});
test('selection scope and edits exclude hidden and locked layers',()=>{
 const p=makeProject(),panel=p.scenes[0].panels[0];panel.layers.push(makeLayer('Other'),makeLayer('Hidden'),makeLayer('Locked'));panel.layers[2].visible=false;panel.layers[3].locked=true;assert.equal(eligibleLayers(panel,panel.layers[0].id,'active').length,1);assert.equal(eligibleLayers(panel,panel.layers[0].id,'visible').length,2);
 for(const l of panel.layers)l.strokes.push({id:uid(),tool:'pencil',color:'#000000',size:2,points:[[10,10,1]]});editSelected(panel,panel.layers.map(l=>({layerId:l.id,id:l.strokes[0].id})),()=>null);assert.equal(panel.layers[0].strokes.length,0);assert.equal(panel.layers[1].strokes.length,0);assert.equal(panel.layers[2].strokes.length,1);assert.equal(panel.layers[3].strokes.length,1);
});
test('bucket fill respects closed boundaries and gap tolerance, with vector contour output',()=>{
 const w=20,h=20,d=new Uint8ClampedArray(w*h*4);for(let y=4;y<=15;y++)for(let x=4;x<=15;x++)if(x===4||x===15||y===4||y===15)d[(y*w+x)*4+3]=255;
 const mask=floodMask(d,w,h,10,10,20,0);assert.equal(mask.reduce((a,b)=>a+b,0),100);const contours=maskContours(mask,w,h,1,1);assert.equal(contours.length,1);assert.equal(contours[0].length,4);assert(pointInPolygon(10,10,contours[0]));
 d[(4*w+10)*4+3]=0;assert(floodMask(d,w,h,10,10,20,0)[0]);assert.equal(floodMask(d,w,h,10,10,20,1)[0],0);
});
test('malformed artwork and unsafe embedded image sources are rejected',()=>{
 const p=makeProject(),l=p.scenes[0].panels[0].layers[0];l.strokes.push({id:uid(),tool:'image',color:'#000000',size:1,points:[[0,0,1],[100,100,1]],source:'https://example.com/secret'});assert.throws(()=>serializeProject(p),/embedded image/);
 l.strokes=[{id:uid(),tool:'shape',color:'#000000',size:1,points:[[0,0,1],[100,100,1]],shape:'line'}];assert.doesNotThrow(()=>serializeProject(p));l.kind='bad' as 'vector';assert.throws(()=>serializeProject(p),/layer type/);
});

test('stroke simplification preserves bends and pressure while keeping straight lines editable',()=>{const points=Array.from({length:101},(_,i)=>[i,10,1] as [number,number,number]);assert.equal(simplifyStroke(points,.5,10).length,2);points[50]=[50,30,.2];const simplified=simplifyStroke(points,.5,10);assert(simplified.some(p=>p[0]===50&&p[2]===.2));});
