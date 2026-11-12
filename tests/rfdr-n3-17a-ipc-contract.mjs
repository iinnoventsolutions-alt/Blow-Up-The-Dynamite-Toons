import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {validateExportRequest}=require('../desktop/isolated-export-ipc-contract.cjs');
const valid={projectId:'project_1',width:1920,height:1080,fps:24,outputName:'Animatic.webm'};
assert.deepEqual(validateExportRequest(valid),valid);
assert.ok(Object.isFrozen(validateExportRequest(valid)));
for(const [change,pattern] of [
 [{executable:'/bin/sh'},/Unexpected/],
 [{destination:'/tmp/output.webm'},/Unexpected/],
 [{outputName:'../evil.webm'},/output name/],
 [{outputName:'foo.mp4'},/output name/],
 [{projectId:'../../etc'},/project ID/],
 [{width:100000},/dimensions/],
 [{fps:0},/fps/],
 [{fps:Infinity},/fps/],
 [{height:1},/dimensions/]
])assert.throws(()=>validateExportRequest({...valid,...change}),pattern);
for(const input of [null,[],{},'x'])assert.throws(()=>validateExportRequest(input));
console.log('RFDR N3.17-A isolated IPC contract PASS');
