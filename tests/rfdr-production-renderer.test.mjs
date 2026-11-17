import assert from 'node:assert/strict';
import {test} from 'node:test';
import {attachIsolatedStoryboardRenderer} from '../src/isolated-electron-renderer.ts';

test('isolated renderer rejects unavailable project without leaking details',async()=>{
 let listener;const replies=[];
 const detach=attachIsolatedStoryboardRenderer({onRequest:callback=>{listener=callback;return()=>{listener=null}},reply:message=>replies.push(message)},()=>null);
 listener({token:'abc123',kind:'frame',index:0});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(replies,[{token:'abc123',kind:'frame',data:null,error:'Export renderer failed'}]);
 detach();assert.equal(listener,null);
});
test('isolated renderer ignores invalid request and teardown stops callbacks',async()=>{
 let listener;const replies=[];
 const detach=attachIsolatedStoryboardRenderer({onRequest:callback=>{listener=callback;return()=>{}},reply:message=>replies.push(message)},()=>null);
 listener({token:'bad token',kind:'frame',index:0});
 listener({token:'valid',kind:'unknown'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(replies.length,0);
 detach();
 listener({token:'valid',kind:'frame',index:0});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(replies.length,0);
});
