#!/usr/bin/env python3
"""N1.1 strict media validation. Any audio trim failure blocks production selection."""
import json,pathlib,subprocess
root=pathlib.Path('diagnostic-output')
results=[]
for audio in (False,True):
 for stress in (False,True):
  label=f"n1-1-{'audio' if audio else 'silent'}-{'stress' if stress else 'normal'}"
  path=root/(label+'.webm')
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(path)]))
  streams=probe['streams']
  v=next(s for s in streams if s['codec_type']=='video')
  assert v['codec_name']=='vp8' and int(v['nb_read_frames'])==144,(label,v)
  assert len(streams)==(2 if audio else 1)
  duration=float(probe['format']['duration'])
  assert abs(duration-6)<0.05,(label,duration)
  decoded=None
  if audio:
   assert next(s for s in streams if s['codec_type']=='audio')['codec_name']=='opus'
   p=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-map','0:a:0','-ar','48000','-ac','1','-f','f32le','-'],capture_output=True,check=True)
   decoded=len(p.stdout)//4
  result={'case':label,'duration':duration,'video_frames':int(v['nb_read_frames']),'decoded_audio_samples':decoded,'expected_audio_samples':288000 if audio else None}
  results.append(result)
  print(json.dumps(result))
(root/'n1-1-strict-results.json').write_text(json.dumps(results,indent=2))
assert all(x['decoded_audio_samples']==288000 for x in results if x['expected_audio_samples']), 'N1.1 BLOCKED: Mediabunny Opus output requires audio-padding correction'
print('N1.1 exact duration and decoded audio acceptance PASS.')
