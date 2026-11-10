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
     console.warn('[RFDR-D45] '+JSON.stringify({kind:'frame',frame:storyboardFrame,intended:storyboardFrame/project.fps,submitAudio,submitWall,delay:submitAudio-storyboardFrame/project.fps}));
     nextFrame++;"""
assert s.count(needle)==1,'frame submission insertion point changed'
s=s.replace(needle,replacement)
s=s.replace('  const begin=()=>{const anchor=', "  const begin=()=>{const session=++rfdrExportSession;console.warn('[RFDR-D45] '+JSON.stringify({kind:'start',session}));const anchor=")
s='let rfdrExportSession=0;\n'+s
s=s.replace('kind:\'frame\',frame:storyboardFrame','kind:\'frame\',session,frame:storyboardFrame')
source.write_text(s)
test=Path('tests/ui-audio.mjs')
t=test.read_text()
needle="page.on('dialog',d=>d.accept());"
replacement="""page.on('console',msg=>{if(msg.text().includes('[RFDR-D45]'))process.stdout.write(msg.text()+'\\n');});"""+needle
assert t.count(needle)==1,'browser log hook insertion point changed'
t=t.replace(needle,replacement)
marker="await video.saveAs('test-results/audio-animatic.webm');"
assert t.count(marker)==1,'export download insertion point changed'
t=t.replace(marker,marker+"console.log('[RFDR-D45-DOWNLOAD] saved=audio-animatic.webm');")
test.write_text(t)
source_marker = '[RFDR-D45]' in source.read_text()
test_marker = '[RFDR-D45]' in test.read_text()
print(f'D4.5.1 instrumentation validation: source_marker={source_marker}, browser_marker={test_marker}', flush=True)
assert source_marker, 'Missing export-source telemetry marker'
assert test_marker, 'Missing browser console relay marker'
print('Applied CI-only frame submission timestamp instrumentation and browser console relay')
