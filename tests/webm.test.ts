import test from 'node:test';
import assert from 'node:assert/strict';
import { withWebmDuration } from '../src/webm-duration.ts';
test('streaming WebM gains finite duration without changing media payload',async()=>{const bytes=new Uint8Array([0x18,0x53,0x80,0x67,0x01,255,255,255,255,255,255,255,0x15,0x49,0xa9,0x66,0x87,0x2a,0xd7,0xb1,0x83,0x0f,0x42,0x40,0x1f,0x43,0xb6,0x75,0x81,0x42]);const out=new Uint8Array(await(await withWebmDuration(new Blob([bytes],{type:'video/webm'}),3)).arrayBuffer());assert.equal(out.length,bytes.length+11);const at=out.findIndex((v,i)=>v===0x44&&out[i+1]===0x89);assert.equal(new DataView(out.buffer).getFloat64(at+3),3000);assert.deepEqual([...out.slice(-6)],[...bytes.slice(-6)]);});
test('unsupported or already indexed WebM headers remain unchanged',async()=>{const bytes=new Uint8Array([1,2,3]);const blob=new Blob([bytes]);assert.equal(await withWebmDuration(blob,3),blob);});
