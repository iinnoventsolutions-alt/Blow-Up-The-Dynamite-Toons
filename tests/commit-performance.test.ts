import test from 'node:test';
import assert from 'node:assert/strict';
import {commit,commitChanged,makeProject,newHistory,undo,redo,editProject,editPanelLayers,makePanel,makeScene,uid} from '../src/model.ts';
import {parseProject,serializeProject} from '../src/project-format.js';

test('prevalidated serialized-change commit preserves Undo, Redo and previous snapshots',()=>{
 const original=makeProject('History validation');
 const history=newHistory(original);
 const changed=editProject(original,p=>{p.scenes[0].panels[0].notes='Paint bucket fill committed';});
 assert.notEqual(serializeProject(original),serializeProject(changed));
 const optimized=commitChanged(history,changed,50),legacy=commit(history,changed,50);
 assert.deepEqual(optimized,legacy);
 assert.equal(optimized.past[0],original);
 assert.equal(optimized.present,changed);
 const back=undo(optimized);assert.equal(back.present,original);
 const forward=redo(back);assert.equal(forward.present,changed);
 assert.equal(original.scenes[0].panels[0].notes,'');
});
test('serialized-content no-op can skip history insertion',()=>{
 const first=makeProject('No change');
 const copy=editProject(first,()=>{});
 assert.equal(serializeProject(first),serializeProject(copy));
 const h=newHistory(first);assert.equal(commit(h,copy),h);
 // App.tsx skips commitChanged when serialized text is equal.
 const apply=serializeProject(first)===serializeProject(copy)?h:commitChanged(h,copy);
 assert.equal(apply,h);
});

test('artwork-only edit shares unaffected project branches and preserves history',()=>{
 const original=makeProject('Artwork structural sharing');
 original.scenes[0].panels.push(makePanel('Second panel',original.fps));
 original.scenes.push(makeScene('Second scene',original.fps));
 const target=original.scenes[0].panels[0];
 const layers=structuredClone(target.layers);
 layers[0].strokes.push({id:uid(),tool:'brush',color:'#112233',size:8,points:[[10,10,1],[40,40,1]]});
 const next=editPanelLayers(original,target.id,layers);
 assert.notEqual(next,original);
 assert.notEqual(next.scenes[0],original.scenes[0]);
 assert.notEqual(next.scenes[0].panels[0],target);
 assert.equal(next.scenes[0].panels[1],original.scenes[0].panels[1]);
 assert.equal(next.scenes[1],original.scenes[1]);
 assert.equal(target.layers[0].strokes.length,0);
 assert.deepEqual(next,editProject(original,draft=>{draft.scenes[0].panels[0].layers=layers;}));
 assert.deepEqual(parseProject(serializeProject(next)),next);
 const committed=commitChanged(newHistory(original),next);
 assert.equal(undo(committed).present,original);
 assert.equal(redo(undo(committed)).present,next);
});
test('artwork-only edit rejects missing panels and invalid layer data',()=>{
 const project=makeProject();
 assert.throws(()=>editPanelLayers(project,'missing',[]),/Panel no longer exists/);
 assert.throws(()=>editPanelLayers(project,project.scenes[0].panels[0].id,[]),/Invalid project collection/);
 assert.equal(project.scenes[0].panels[0].layers.length,1);
});
