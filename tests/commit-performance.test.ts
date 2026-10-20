import test from 'node:test';
import assert from 'node:assert/strict';
import {commit,commitChanged,makeProject,newHistory,undo,redo,editProject} from '../src/model.ts';
import {serializeProject} from '../src/project-format.js';

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
