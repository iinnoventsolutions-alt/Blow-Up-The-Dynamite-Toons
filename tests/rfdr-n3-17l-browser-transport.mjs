import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createIsolatedBrowserTransport}=require('../desktop/isolated-browser-transport.cjs');
const controller=new AbortController(),signal=controller.signal;
const t=createIsolatedBrowserTransport({
 requestFrame:async index=>({index,timestampUs:index*125000,pixels:new Uint8ClampedArray(16)}),
 requestAudio:async()=>({sampleRate:48000,samples:new Float32Array([.5])})
});
assert.deepEqual([... (await t.frame(1,2,2,8,signal)).pixels],Array(16).fill(0));
assert.equal((await t.audio(signal)).samples[0],.5);
await assert.rejects(t.frame(-1,2,2,8,signal),/Invalid frame request/);
const bad=createIsolatedBrowserTransport({requestFrame:async()=>({index:0,timestampUs:0,pixels:new Uint8Array(2)}),requestAudio:async()=>null});
await assert.rejects(bad.frame(0,2,2,8,signal),/Invalid browser frame/);
const pending=createIsolatedBrowserTransport({requestFrame:async()=>new Promise(()=>{}),requestAudio:async()=>null,frameTimeoutMs:10});
await assert.rejects(pending.frame(0,2,2,8,signal),/timed out/);
const abort=new AbortController();
const cancellable=createIsolatedBrowserTransport({requestFrame:async()=>new Promise(()=>{}),requestAudio:async()=>null});
const promise=cancellable.frame(0,2,2,8,abort.signal);abort.abort();
await assert.rejects(promise,/abort/i);
const concurrent=createIsolatedBrowserTransport({requestFrame:async()=>new Promise(resolve=>setTimeout(()=>resolve({index:0,timestampUs:0,pixels:new Uint8Array(16)}),20)),requestAudio:async()=>null});
const first=concurrent.frame(0,2,2,8,signal);
await assert.rejects(concurrent.audio(signal),/Concurrent/);await first;
t.close();await assert.rejects(t.audio(signal),/closed/);
console.log('RFDR N3.17-L bounded pull transport, cancellation, timeout and validation PASS');
