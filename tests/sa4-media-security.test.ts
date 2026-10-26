import test from 'node:test';
import assert from 'node:assert/strict';
import { readEmbeddedImage } from '../src/image-import.ts';
import { importAudio } from '../src/audio-engine.ts';
import { makeProject } from '../src/model.ts';
import { parseProject, serializeProject } from '../src/project-format.js';

test('SA-4 image import rejects actual oversized bytes despite a small declared size', async () => {
 const file = { size: 1, arrayBuffer: async () => new ArrayBuffer(8 * 1024 * 1024 + 1) } as File;
 await assert.rejects(readEmbeddedImage(file), /smaller than 8 MB/);
});

test('SA-4 audio import rejects actual oversized bytes before accessing AudioContext', async () => {
 const file = { size: 1, arrayBuffer: async () => new ArrayBuffer(25 * 1024 * 1024 + 1) } as File;
 await assert.rejects(importAudio(file), /up to 25 MB/);
});

test('SA-4 embedded images reject unsupported MIME types and invalid encoding', () => {
 const p = makeProject();
 const layer = p.scenes[0].panels[0].layers[0];
 layer.image = 'data:image/svg+xml;base64,PHN2Zz4=';
 assert.throws(() => serializeProject(p), /Invalid embedded image/);
 layer.image = 'data:image/png;base64,%%%';
 assert.throws(() => serializeProject(p), /Invalid embedded image/);
});

test('SA-4 embedded audio rejects unsupported MIME types and oversized sources', () => {
 const p = makeProject();
 p.audioAssets.push({ id: 'sa4-audio', name: 'Untrusted', source: 'data:audio/svg;base64,AAAA', duration: 1, sampleRate: 44100, channels: 1, peaks: [0] });
 assert.throws(() => parseProject(JSON.stringify(p)), /Invalid embedded audio/);
 p.audioAssets[0].source = 'data:audio/wav;base64,' + 'A'.repeat(36 * 1024 * 1024 + 1);
 assert.throws(() => parseProject(JSON.stringify(p)), /Invalid embedded audio/);
});
