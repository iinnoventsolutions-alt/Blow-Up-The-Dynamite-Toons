import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

// RFDR-A1.5-D4: deliberately RED until a frame-consistent export scheduler is implemented.
// D3 demonstrated that computing frame directly from elapsed time skips storyboard
// frame indices whenever requestAnimationFrame callbacks are delayed.
const source=readFileSync(new URL('../src/animatic-export.ts',import.meta.url),'utf8');

test('animatic export does not skip storyboard frames when the rendering callback is delayed',()=>{
 assert.doesNotMatch(source,/frame\s*=\s*Math\.min\(total\s*-\s*1\s*,\s*Math\.floor\(elapsed\s*\*\s*project\.fps\)\)/,
  'D3 confirmed that jumping directly to the elapsed-time frame skips transitions under load; implement a sequential, paced frame scheduler');
 assert.match(source,/requestFrame\(\)/,
  'Preserve the Electron manual frame submission contract');
});

test('animatic export retains audio scheduling, cancellation and recorder flush contracts',()=>{
 assert.match(source,/scheduleAudio\(/);
 assert.match(source,/signal\.removeEventListener\('abort'/);
 assert.match(source,/recording\.requestData\(\)/);
 assert.match(source,/captureStream\(0\)/);
});
