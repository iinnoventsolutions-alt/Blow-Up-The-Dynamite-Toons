'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const desktop = (name) => fs.readFileSync(path.join(__dirname, '..', 'desktop', name), 'utf8');

test('SA-2 preload exposes only fixed, named IPC channels', () => {
  const source = desktop('preload.cjs');
  const channels = [...source.matchAll(/ipcRenderer\.(?:invoke|send)\('([^']+)'/g)].map(match => match[1]);
  const expected = [
    'isolated-export:start', 'isolated-export:progress', 'isolated-export:cancel',
    'isolated-export:browser-reply',
    'export:pdf', 'project:save', 'project:open', 'project:recent', 'project:clear-recent',
    'project:open-recent', 'project:new', 'project:recovery',
    'project:recover', 'project:discard-recovery', 'project:snapshot',
    'project:dirty', 'project:close-after-save', 'project:cancel-close',
    'app:renderer-ready'
  ];
  assert.deepEqual([...channels].sort(), [...expected].sort());
  assert.equal(new Set(channels).size, channels.length);
  assert.doesNotMatch(source, /ipcRenderer\.(?:invoke|send)\(\s*[a-zA-Z_$]/);
  assert.doesNotMatch(source, /exposeInMainWorld\([^,]+,\s*ipcRenderer/);
});

test('SA-2 all privileged main-process IPC handlers pass sender authorization', () => {
  const source = desktop('main.cjs');
  assert.match(source, /function handle\(channel, fn\).*trusted\(event\)/);
  const direct = [...source.matchAll(/ipcMain\.on\('([^']+)',\s*\(event[^)]*\)\s*=>\s*\{([^}]+)\}/g)];
  assert.equal(direct.length, 4);
  for (const [, channel, body] of direct) {
    assert.match(body, /trusted\(event\)/, channel);
  }
});

test('SA-2 PDF export rejects non-PDF and oversized input before save dialog', () => {
  const source = desktop('pdf-export.cjs');
  assert.match(source, /data instanceof ArrayBuffer/);
  assert.match(source, /128 \* 1024 \* 1024/);
  assert.match(source, /%PDF-/);
  assert.ok(source.indexOf("'%PDF-'") < source.indexOf('dialog.showSaveDialog'));
});

test('SA-2 project save and snapshot validate project format before writing', () => {
  const source = desktop('main.cjs');
  assert.match(source, /handle\('project:save',[\s\S]*?parseProject\(text\)/);
  assert.match(source, /handle\('project:snapshot',[^\n]*parseProject\(text\)/);
  const persistence = desktop('persistence.cjs');
  assert.match(persistence, /fs\.open\(temp, 'wx', 0o600\)/);
  assert.match(persistence, /parseProject\(text\)/);
});


test('V1124-P2 clear recent only updates the persisted index through trusted IPC', () => {
 const source=desktop('main.cjs');
 assert.match(source,/handle\('project:clear-recent',\s*\(\) => queued\(async \(\) => \{/);
 assert.match(source,/atomicWrite\(dataPath\('recent.json'\), '\[\]'\)/);
 assert.doesNotMatch(source,/handle\('project:clear-recent',[\s\S]*?fs\.rm\(dataPath\('recent.json'\)/);
});

const {validateExportRequest}=require('../desktop/isolated-export-ipc-contract.cjs');
const legacyExport={projectId:'test-project',width:640,height:360,fps:24,outputName:'test.webm'};
const formatRequest=format=>({...legacyExport,format,outputName:'test.'+format});
const trustedFormats={allowMp4Mov:true};

test('D3.1 legacy WebM preserves request shape and immutability',()=>{
 const result=validateExportRequest(legacyExport);
 assert.deepEqual(result,legacyExport);
 assert.ok(Object.isFrozen(result));
});
test('D3.1 explicit WebM remains accepted by default',()=>{
 assert.deepEqual(validateExportRequest(formatRequest('webm')),formatRequest('webm'));
});
test('D3.1 MP4 and MOV require trusted opt-in',()=>{
 for(const format of ['mp4','mov']){
  const request=formatRequest(format);
  assert.throws(()=>validateExportRequest(request),/unavailable/);
  assert.throws(()=>validateExportRequest(request,{allowMp4Mov:1}),/unavailable/);
  assert.throws(()=>validateExportRequest({...request,allowMp4Mov:true}),/Unexpected/);
  assert.deepEqual(validateExportRequest(request,trustedFormats),request);
 }
});
test('D3.1 rejects unsupported and malformed format selectors',()=>{
 for(const format of ['avi','MP4','',null,undefined,1,{},['mp4']])
  assert.throws(()=>validateExportRequest({...legacyExport,format},trustedFormats),/Invalid export format/);
});
test('D3.1 rejects mismatched extensions and unsafe filenames',()=>{
 for(const format of ['webm','mp4','mov']){
  for(const outputName of ['../test.'+format,'/tmp/test.'+format,'a/b.'+format,'a\\b.'+format,'a..b.'+format,'a.'+format+'.exe','a.'+format+'\n','a'.repeat(101)+'.'+format,...['webm','mp4','mov'].filter(f=>f!==format).map(f=>'test.'+f)])
   assert.throws(()=>validateExportRequest({...formatRequest(format),outputName},trustedFormats),/Invalid output name/);
 }
 assert.throws(()=>validateExportRequest({...legacyExport,outputName:'test.mp4'},trustedFormats),/Invalid output name/);
});
test('D3.1 preserves metadata boundaries and rejects unexpected fields',()=>{
 for(const patch of [{projectId:'../test'},{width:1},{height:4097},{width:2.5},{fps:0},{fps:121},{fps:NaN},{encoderPath:'/tmp/ffmpeg'},{args:[]},{outputPath:'/tmp/test.mp4'}])
  assert.throws(()=>validateExportRequest({...formatRequest('mp4'),...patch},trustedFormats));
 for(const key of Object.keys(legacyExport)){
  const request=formatRequest('mov');delete request[key];
  assert.throws(()=>validateExportRequest(request,trustedFormats),/Unexpected/);
 }
});
