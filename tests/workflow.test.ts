import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,makeScene,makePanel,uid,cameraAt,movePanels,findPanel,duplicateStoryboardPanel,removeStoryboardPanel,newHistory,commit,undo} from '../src/model.ts';
import {normalizePreferences,nextName,defaults} from '../src/preferences.ts';
function fixture(interpolation:'linear'|'ease'|'hold'){
 const p=makeProject();p.scenes[0].panels=[makePanel('Panel 1'),makePanel('Panel 2'),makePanel('Panel 3')];for(const panel of p.scenes[0].panels)panel.duration=10;
 p.scenes[0].camera=[{id:uid(),frame:0,x:200,y:300,zoom:1,rotation:0,interpolation},{id:uid(),frame:29,x:1200,y:700,zoom:2,rotation:90,interpolation:'linear'}];
 p.scenes.push(makeScene('Scene 2'));p.scenes[1].panels[0].duration=10;
 p.audioAssets=[{id:uid(),name:'voice',source:'data:audio/wav;base64,UklGRg==',duration:1,sampleRate:24000,channels:1,peaks:[0]}];
 p.audioTracks=[{id:uid(),name:'voice',gain:1,mute:false,solo:false,clips:[{id:uid(),assetId:p.audioAssets[0].id,name:'voice',start:4,offset:0,duration:8,gain:1}]}];
 return p;
}
function compare(before:ReturnType<typeof makeProject>,after:ReturnType<typeof makeProject>,source:string,dest=source){
 const a=findPanel(before,source)!,b=findPanel(after,dest)!;let sa=0,sb=0;for(const p of a.scene.panels){if(p.id===source)break;sa+=p.duration;}for(const p of b.scene.panels){if(p.id===dest)break;sb+=p.duration;}
 for(let frame=0;frame<a.panel.duration;frame++)for(const k of ['x','y','zoom','rotation'] as const)assert(Math.abs(cameraAt(a.scene,sa+frame,before)[k]-cameraAt(b.scene,sb+frame,after)[k])<1e-7,k+' frame '+frame);
}
for(const interpolation of ['linear','ease','hold'] as const)test('camera '+interpolation+' stays with panels through cross-scene moves, duplication and deletion',()=>{
 const p=fixture(interpolation),[a,b]=p.scenes,moved=a.panels[1].id;
 const next=movePanels(p,[{panelId:moved,sceneId:b.id,beforePanelId:b.panels[0].id}]);
 for(const entry of p.scenes.flatMap(s=>s.panels))compare(p,next,entry.id);
 assert.deepEqual(next.audioTracks,p.audioTracks);assert.deepEqual(undo(commit(newHistory(p),next)).present,p);
 const copy=duplicateStoryboardPanel(p,moved);compare(p,copy.project,moved,copy.panelId);
 for(const panel of a.panels)compare(p,copy.project,panel.id);
 const deleted=removeStoryboardPanel(p,moved);for(const panel of a.panels.filter(x=>x.id!==moved))compare(p,deleted,panel.id);
 assert.deepEqual(deleted.audioTracks,p.audioTracks);
});
test('intact ease keys retain interpolation; no-op moves retain camera arrays; empty source scenes are valid',()=>{
 const p=fixture('ease'),s=p.scenes[0];s.camera[1].frame=9;
 const first=s.panels[0].id,original=s.camera[0].id;
 const next=movePanels(p,[{panelId:first,sceneId:p.scenes[1].id,beforePanelId:null}]);assert.equal(findPanel(next,first)!.scene.camera.find(k=>k.id===original)!.interpolation,'ease');
 const noop=movePanels(p,[{panelId:first,sceneId:s.id,beforePanelId:s.panels[1].id}]);assert.deepEqual(noop,p);
 const last=p.scenes[1].panels[0].id,m=movePanels(p,[{panelId:last,sceneId:s.id,beforePanelId:null}]);assert.equal(m.scenes[1].panels.length,0);assert.deepEqual(m.scenes[1].camera,[]);
});
test('preferences migrate legacy values, clamp invalid data and name new items without renaming existing ones',()=>{
 assert.deepEqual(normalizePreferences(null),defaults);const p=normalizePreferences({defaultSeconds:9,durationMode:'frames',iconStyle:'classic',pngMaxEdge:Infinity,sceneDigits:99});assert.equal(p.defaultSeconds,9);assert.equal(p.durationMode,'frames');assert.equal(p.pngMaxEdge,8192);assert.equal(p.sceneDigits,6);
 assert.equal(nextName('Scene',['Scene 01','Scene 30','Custom'],3,10),'Scene 040');assert.equal(nextName('Panel',['Panel 1','Panel 3'],0),'Panel 4');
});
test('complex cross-panel ease rejects atomically at the camera key budget',()=>{
 const p=fixture('ease'),s=p.scenes[0];s.panels=[makePanel(),makePanel()];s.panels.forEach(p=>p.duration=5001);s.camera[1].frame=10001;
 const original=structuredClone(p);assert.throws(()=>duplicateStoryboardPanel(p,s.panels[0].id),/10,000/);assert.deepEqual(p,original);
});
test('batch moves preserve per-panel poses with unsorted imported camera keys',()=>{
 const p=fixture('ease');p.scenes[0].camera.reverse();const s=p.scenes[0],target=p.scenes[1];
 const next=movePanels(p,[{panelId:s.panels[2].id,sceneId:target.id,beforePanelId:target.panels[0].id},{panelId:s.panels[0].id,sceneId:target.id,beforePanelId:null}]);
 for(const panel of p.scenes.flatMap(s=>s.panels))compare(p,next,panel.id);
});
