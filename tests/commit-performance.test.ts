import test from 'node:test';
import assert from 'node:assert/strict';
import {commit,commitChanged,makeProject,newHistory,undo,redo,editProject,editPanelLayers,makePanel,makeScene,uid} from '../src/model.ts';
import {parseProject,serializeProject,serializeArtworkProject} from '../src/project-format.js';

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

test('4.3A deferred artwork validation rejects invalid data before history changes',()=>{
 const original=makeProject('Deferred gate');
 const panel=original.scenes[0].panels[0];
 const history=newHistory(original);
 const invalidLayers=structuredClone(panel.layers);
 invalidLayers[0].strokes.push({id:uid(),tool:'fill',color:'#112233',size:1,points:[[10,10,1]]});
 const prepared=editPanelLayers(original,panel.id,invalidLayers,false);
 assert.equal(prepared.scenes[0].panels[0].layers,invalidLayers);
 assert.throws(()=>serializeProject(prepared),/Fill needs contour geometry/);
 assert.equal(history.present,original);
 assert.equal(original.scenes[0].panels[0].layers[0].strokes.length,0);
});
test('4.3A deferred artwork commit matches validated history, save and undo',()=>{
 const original=makeProject('Deferred equivalence');
 original.scenes[0].panels.push(makePanel('Unaffected panel',original.fps));
 const panel=original.scenes[0].panels[0];
 const layers=structuredClone(panel.layers);
 layers[0].strokes.push({id:uid(),tool:'pencil',color:'#112233',size:3,points:[[10,10,1],[20,20,1]]});
 const deferred=editPanelLayers(original,panel.id,layers,false);
 const checked=editPanelLayers(original,panel.id,layers);
 assert.equal(serializeProject(deferred),serializeProject(checked));
 assert.equal(deferred.scenes[0].panels[1],original.scenes[0].panels[1]);
 const changed=commitChanged(newHistory(original),deferred);
 assert.equal(undo(changed).present,original);
 assert.equal(redo(undo(changed)).present,deferred);
 assert.deepEqual(parseProject(serializeProject(deferred)),checked);
});
test('4.3A serializer still rejects oversized artwork and invalid embedded images',()=>{
 const original=makeProject('Serialization guardrails');
 const panel=original.scenes[0].panels[0];
 const layers=structuredClone(panel.layers);
 layers[0].image='https://example.com/untrusted.png';
 assert.throws(()=>serializeProject(editPanelLayers(original,panel.id,layers,false)),/Invalid embedded image/);
 const huge=structuredClone(panel.layers);
 huge[0].strokes.push({id:uid(),tool:'brush',color:'#112233',size:3,points:Array.from({length:100001},()=>[10,10,1])});
 assert.throws(()=>serializeProject(editPanelLayers(original,panel.id,huge,false)),/Invalid project collection/);
});

test('4.3A.2 artwork serialization equals strict serialized JSON and roundtrips',()=>{
 const original=makeProject('Artwork fast serialization');
 original.scenes[0].panels.push(makePanel('Second',original.fps));
 const target=original.scenes[0].panels[0];
 const layers=structuredClone(target.layers);
 layers[0].strokes.push({id:uid(),tool:'brush',color:'#123456',size:7,points:[[3,4,.5],[9,11,1]]});
 const updated=editPanelLayers(original,target.id,layers,false);
 const text=serializeArtworkProject(updated);
 assert.equal(text,serializeProject(updated));
 assert.deepEqual(parseProject(text),updated);
 const history=commitChanged(newHistory(original),updated);
 assert.equal(undo(history).present,original);
 assert.equal(redo(undo(history)).present,updated);
});
test('4.3A.2 artwork serializer rejects invalid geometry, duplicate IDs and remote media',()=>{
 const original=makeProject('Artwork rejection');
 const layers=structuredClone(original.scenes[0].panels[0].layers);
 layers[0].strokes.push({id:uid(),tool:'brush',color:'#123456',size:4,points:[[0,0,1],[4,4,1]]});
 const invalid=editPanelLayers(original,original.scenes[0].panels[0].id,layers,false);
 invalid.scenes[0].panels[0].layers[0].strokes[0].points[0][2]=2;
 assert.throws(()=>serializeArtworkProject(invalid),/Invalid project number/);
 const duplicate=structuredClone(original);
 duplicate.scenes[0].panels[0].layers[0].id=duplicate.id;
 assert.throws(()=>serializeArtworkProject(duplicate),/duplicate object ID/);
 const media=structuredClone(original);
 media.scenes[0].panels[0].layers[0].image='https://example.com/not-embedded.png';
 assert.throws(()=>serializeArtworkProject(media),/Invalid embedded image/);
});

test('serialization phase diagnostics preserve output and report nonnegative timings',()=>{
 const project=makeProject('Serialization phase diagnostics');
 const measurements=[];
 const serialized=serializeArtworkProject(project,(label,elapsed)=>measurements.push([label,elapsed]));
 assert.equal(serialized,serializeProject(project));
 assert.deepEqual(measurements.map(([label])=>label),[
  'Artwork serialize: project validation',
  'Artwork serialize: JSON stringify',
  'Artwork serialize: UTF-8 size check'
 ]);
 assert.ok(measurements.every(([,elapsed])=>Number.isFinite(elapsed)&&elapsed>=0));
 const bad=structuredClone(project);
 bad.scenes[0].panels[0].layers=[];
 assert.throws(()=>serializeArtworkProject(bad,(label,elapsed)=>measurements.push([label,elapsed)),/Invalid project collection/);
});
