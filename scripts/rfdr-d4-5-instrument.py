#!/usr/bin/env python3
"""D4.5 CI-only instrumentation: never modifies the release source branch."""
from pathlib import Path
source=Path('src/animatic-export.ts')
s=source.read_text()
needle='paintPlayback(canvas,project,nextFrame,width,pictures);\n     videoTrack.requestFrame();\n     nextFrame++;'
replacement="""const storyboardFrame=nextFrame;
     const submitWall=performance.now();
     const submitAudio=ctx.currentTime-anchor;
     paintPlayback(canvas,project,nextFrame,width,pictures);
     videoTrack.requestFrame();
     console.info('[RFDR-D45] '+JSON.stringify({kind:'frame',frame:storyboardFrame,intended:storyboardFrame/project.fps,submitAudio,submitWall,delay:submitAudio-storyboardFrame/project.fps}));
     nextFrame++;"""
assert s.count(needle)==1,'frame submission insertion point changed'
s=s.replace(needle,replacement)
source.write_text(s)
test=Path('tests/ui-audio.mjs')
t=test.read_text()
needle="page.on('dialog',d=>d.accept());"
replacement="""page.on('console',msg=>{if(msg.text().startsWith('[RFDR-D45]'))console.log(msg.text());});"""+needle
assert t.count(needle)==1,'browser log hook insertion point changed'
test.write_text(t)
print('Applied CI-only frame submission timestamp instrumentation')
