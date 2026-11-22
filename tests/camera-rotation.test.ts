import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraRotationHandle,pointerAngle,rotateCamera} from '../src/camera-rotation.ts';
test('RC1 rotation handle projects beyond the rotated top edge',()=>{
 const p={x:100,y:100,zoom:1,rotation:0};
 assert.deepEqual(cameraRotationHandle(p,[[0,0],[200,0],[200,200],[0,200]],20),{x:100,y:-20,anchorX:100,anchorY:0});
 const h=cameraRotationHandle(p,[[200,0],[200,200],[0,200],[0,0]],20);
 assert.equal(h.x,220);assert.equal(h.y,100);
});
test('RC1 drag rotation preserves pan and zoom and applies 15 degree Shift snap',()=>{
 const p={x:100,y:100,zoom:2,rotation:10};
 const start=pointerAngle(100,0,p),end=pointerAngle(200,100,p);
 assert.deepEqual(rotateCamera(p,start,end),{...p,rotation:100});
 assert.deepEqual(rotateCamera(p,start,end,true),{...p,rotation:105});
 assert.equal(p.rotation,10);
});
test('RC1 shortest-angle calculation crosses 180 degree boundary without jumping',()=>{
 const p={x:0,y:0,zoom:1,rotation:45};
 assert.ok(Math.abs(rotateCamera(p,179,-179).rotation-47)<1e-8);
 assert.ok(Math.abs(rotateCamera(p,-179,179).rotation-43)<1e-8);
});
