import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Round 5 brand identity matches web, desktop and macOS package',async()=>{
 const [manifest,metadata,html,app,desktop,png,icns]=await Promise.all([
  readFile('package.json','utf8').then(JSON.parse),
  readFile('src/build-info.json','utf8').then(JSON.parse),
  readFile('index.html','utf8'),
  readFile('src/App.tsx','utf8'),
  readFile('desktop/main.cjs','utf8'),
  readFile('public/innovent-icon.png'),
  readFile('public/innovent-icon.icns')
 ]);
 assert.equal(manifest.build.productName,metadata.name);
 assert.equal(manifest.description,metadata.name);
 assert.equal(manifest.build.mac.icon,'public/innovent-icon.icns');
 assert.match(html,/href="\/innovent-icon\.svg"/);
 assert.match(app,/src="\.\/innovent-icon\.svg"/);
 assert.match(desktop,/dist\/innovent-icon\.png/);
 assert.match(app,/src="\.\/innovent-logo\.jpg"/);
 assert.match(svg,/<svg\b/);
 assert.match(svg,/#[0-9a-fA-F]{6}/);
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG magic');
 assert.equal(icns.subarray(0,4).toString('ascii'),'icns','macOS icon magic');
 assert(png.length>1000&&icns.length>1000,'Nonempty packaged icon artwork');
});
