#!/usr/bin/env python3
"""Diagnostic-only source instrumentation; applied to temporary CI checkout."""
from pathlib import Path
p=Path('src/animatic-export.ts')
s=p.read_text()
needle='if(frame!==last){paintPlayback(canvas,project,frame,width,pictures);'
assert needle in s, 'frame scheduler changed; do not silently skip instrumentation'
s=s.replace(needle,'''if(frame!==last){console.info('[RFDR-D3] '+JSON.stringify({kind:'render',frame,previous:last,skipped:Math.max(0,frame-last-1),elapsed,wall:performance.now()}));paintPlayback(canvas,project,frame,width,pictures);''',1)
p.write_text(s)
p=Path('tests/ui-audio.mjs')
s=p.read_text()
needle="const errors=[];page.on('pageerror',e=>errors.push(e.message));"
assert needle in s, 'test console hook changed'
s=s.replace(needle,needle+"page.on('console',msg=>{if(msg.text().startsWith('[RFDR-D3]'))console.log(msg.text());});",1)
p.write_text(s)
print('D3 diagnostic instrumentation applied to disposable checkout')
