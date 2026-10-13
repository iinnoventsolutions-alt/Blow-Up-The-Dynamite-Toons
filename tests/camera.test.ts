import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraAt, changeDuration, commit, editProject, makePanel, makeProject, newHistory, redo, undo } from '../src/model.ts';
import { cameraCorners, localPanelStart, moveCameraKey, putCameraKey, sceneStart } from '../src/camera.ts';
import { parseProject, serializeProject } from '../src/project-format.js';
test('key insertion samples the current pose, updates at the same frame, and round trips through history',()=>{
 const p=makeProject(),s=p.scenes[0];putCameraKey(s,p,0);putCameraKey(s,p,119,{x:1199,zoom:2,rotation:45});
 const mid=cameraAt(s,60,p);const k=putCameraKey(s,p,60);assert.equal(k.x,mid.x);assert.equal(k.zoom,mid.zoom);
 const id=k.id;putCameraKey(s,p,60,{x:1200});assert.equal(s.camera.length,3);assert.equal(s.camera[1].id,id);
 let h=newHistory(p);h=commit(h,editProject(p,d=>{d.scenes[0].camera[1].zoom=3;}));assert.equal(undo(h).present.scenes[0].camera[1].zoom,k.zoom);assert.equal(redo(undo(h)).present.scenes[0].camera[1].zoom,3);
 assert.deepEqual(parseProject(serializeProject(h.present)),h.present);
});
test('linear, ease and hold interpolate and camera resets between scenes',()=>{
 const p=makeProject(),s=p.scenes[0];putCameraKey(s,p,0,{x:0,rotation:0});putCameraKey(s,p,100,{x:100,zoom:3,rotation:90});
 assert.equal(cameraAt(s,25,p).x,25);s.camera[0].interpolation='ease';assert.equal(cameraAt(s,25,p).x,15.625);
 s.camera[0].interpolation='hold';assert.equal(cameraAt(s,99,p).x,0);assert.equal(cameraAt(s,100,p).x,100);
 putCameraKey(s,p,50,{x:50});s.camera[0].interpolation='hold';assert.equal(cameraAt(s,49,p).x,0);assert.equal(cameraAt(s,50,p).x,50,'Hold switches at an intermediate key exactly');
 const noKeys={...s,camera:[]};assert.deepEqual(cameraAt(noKeys,50,p),{x:960,y:540,zoom:1,rotation:0});
});
test('timing edits scale within a panel and shift later keys; collisions reject atomically',()=>{
 const p=makeProject(),s=p.scenes[0];s.panels.push(makePanel());putCameraKey(s,p,0);putCameraKey(s,p,119);putCameraKey(s,p,120);putCameraKey(s,p,239);
 changeDuration(s,s.panels[0],60);assert.deepEqual(s.camera.map(k=>k.frame),[0,59,60,179]);
 const before=serializeProject(p);assert.throws(()=>changeDuration(s,s.panels[0],1),/merge camera keys/);assert.equal(serializeProject(p),before);
 assert.equal(localPanelStart(s,s.panels[1]),60);assert.equal(sceneStart(p,s),0);
});
test('key retiming rejects occupied or out-of-scene frames and preserves identity',()=>{
 const p=makeProject(),s=p.scenes[0],a=putCameraKey(s,p,0),b=putCameraKey(s,p,119);
 assert.throws(()=>moveCameraKey(s,a.id,119),/already occupies/);assert.throws(()=>moveCameraKey(s,a.id,-1),/inside the scene/);
 moveCameraKey(s,b.id,50);assert.deepEqual(s.camera.map(k=>k.frame),[0,50]);assert.equal(s.camera[1].id,b.id);
});
test('frame geometry uses project aspect ratio, zoom, pan and rotation',()=>{
 const p=makeProject();assert.deepEqual(cameraCorners({x:960,y:540,zoom:1,rotation:0},p),[[0,0],[1920,0],[1920,1080],[0,1080]]);
 const c=cameraCorners({x:960,y:540,zoom:2,rotation:90},p);assert(Math.abs(c[0][0]-1230)<1e-8);assert(Math.abs(c[0][1]-60)<1e-8);
});
