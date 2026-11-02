import test from 'node:test';
import assert from 'node:assert/strict';
import {makePanel,makeProject,makeScene} from '../src/model.ts';
import {cameraOffset,defaultCamera,resolveSequentialCamera,type SequentialCameraScene} from '../src/sequential-camera.ts';
test('sequential camera: default scene, inherited panel, independent new scene',()=>{
 const p=makeProject(),s=p.scenes[0];s.panels.push(makePanel('Second'));
 const c:SequentialCameraScene={panels:{}},neutral=defaultCamera(p);
 assert.deepEqual(resolveSequentialCamera(s,p,c,s.panels[1].id,0).pose,neutral);
 const other=makeScene('Scene 2');p.scenes.push(other);
 assert.deepEqual(resolveSequentialCamera(other,p,{panels:{}},other.panels[0].id,0).pose,neutral);
});
test('sequential camera: scene baseline propagates, animated OUT carries downstream, IN remains locked',()=>{
 const p=makeProject(),s=p.scenes[0];for(let i=2;i<=10;i++)s.panels.push(makePanel('Panel '+i));
 const base={x:1050,y:610,zoom:1.3,rotation:5};
 const c:SequentialCameraScene={baseline:base,panels:{}};
 for(const panel of s.panels)assert.deepEqual(resolveSequentialCamera(s,p,c,panel.id,0).pose,base);
 const end={x:1400,y:710,zoom:2,rotation:15};
 c.panels[s.panels[5].id]={mode:'animated',keys:[{frame:119,...cameraOffset(base,end),interpolation:'linear'}]};
 const animated=resolveSequentialCamera(s,p,c,s.panels[5].id,119);
 assert.deepEqual(animated.inPose,base);assert.deepEqual(animated.outPose,end);
 for(const panel of s.panels.slice(6))assert.deepEqual(resolveSequentialCamera(s,p,c,panel.id,0).pose,end);
 assert.deepEqual(resolveSequentialCamera(s,p,c,s.panels[4].id,0).pose,base);
});
test('sequential camera: explicit break and scene-local continuity',()=>{
 const p=makeProject(),s=p.scenes[0];s.panels.push(makePanel('Two'),makePanel('Three'));
 const pose={x:400,y:300,zoom:2,rotation:0},c:SequentialCameraScene={panels:{[s.panels[1].id]:{mode:'break',pose}}};
 assert.deepEqual(resolveSequentialCamera(s,p,c,s.panels[2].id,0).pose,pose);
 assert.deepEqual(resolveSequentialCamera(s,p,c,s.panels[0].id,0).pose,defaultCamera(p));
});
test('sequential camera: interpolated local keys, hold, and invalid input',()=>{
 const p=makeProject(),s=p.scenes[0],base=defaultCamera(p);
 const end={x:1160,y:540,zoom:1,rotation:0};
 const c:SequentialCameraScene={panels:{[s.panels[0].id]:{mode:'animated',keys:[{frame:100,...cameraOffset(base,end),interpolation:'hold'}]}}};
 assert.equal(resolveSequentialCamera(s,p,c,s.panels[0].id,50).pose.x,1060);
 assert.equal(resolveSequentialCamera(s,p,c,s.panels[0].id,100).pose.x,1160);
 c.panels[s.panels[0].id]={mode:'animated',keys:[{frame:0,...cameraOffset(base,end),interpolation:'linear'}]};
 assert.throws(()=>resolveSequentialCamera(s,p,c,s.panels[0].id,0),/Invalid sequential/);
 assert.equal(base.x,960);
});

test('sequential camera: reordering preserves relative animation and recomputes inherited IN',()=>{
 const p=makeProject(),s=p.scenes[0];s.panels.push(makePanel('Animated'),makePanel('Follower'));
 const a=s.panels[0],b=s.panels[1],c=s.panels[2];
 const pose={x:1100,y:600,zoom:1.5,rotation:10};
 const offset={x:100,y:-40,zoom:2,rotation:15};
 const config:SequentialCameraScene={panels:{[a.id]:{mode:'static',pose},[b.id]:{mode:'animated',keys:[{frame:b.duration-1,...offset,interpolation:'linear'}]}}};
 assert.deepEqual(resolveSequentialCamera(s,p,config,b.id,0).inPose,pose);
 assert.deepEqual(resolveSequentialCamera(s,p,config,c.id,0).pose,{x:1200,y:560,zoom:3,rotation:25});
 s.panels=[b,a,c];
 const neutral=defaultCamera(p);
 assert.deepEqual(resolveSequentialCamera(s,p,config,b.id,0).inPose,neutral);
 assert.deepEqual(resolveSequentialCamera(s,p,config,b.id,b.duration-1).outPose,{x:1060,y:500,zoom:2,rotation:15});
 assert.deepEqual(resolveSequentialCamera(s,p,config,c.id,0).pose,pose);
});
