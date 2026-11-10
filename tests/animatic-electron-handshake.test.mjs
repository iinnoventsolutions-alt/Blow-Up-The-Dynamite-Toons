import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

// RFDR-A1: guard the previously accepted Electron MediaRecorder handshake.
// Browser-only WebM tests cannot detect Electron's deferred first-frame behavior.
const source=readFileSync(new URL('../src/animatic-export.ts',import.meta.url),'utf8');
test('Electron animatic export explicitly submits canvas frames',()=>{
 assert.match(source,/captureStream\(0\)/,'Use manual canvas capture rather than timer-based capture');
 assert.match(source,/videoTrack\.requestFrame\(\)/,'Submit each painted frame explicitly to Electron');
});
test('Animatic export excludes inactive audio tracks from the recording stream',()=>{
 assert.match(source,/hasAudio\s*=/,'Determine whether the project contains audible audio');
 assert.match(source,/hasAudio\s*\?\s*output\.stream\.getAudioTracks\(\)\s*:\s*\[\]/,'Avoid adding an empty audio stream');
});
test('Animatic export flushes its final encoded data before stopping',()=>{
 assert.match(source,/recording\.requestData\(\)/,'Flush MediaRecorder before final stop');
});
