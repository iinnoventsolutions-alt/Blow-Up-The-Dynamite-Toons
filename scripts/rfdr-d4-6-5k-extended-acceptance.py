#!/usr/bin/env python3
"""D4.6.5K six-second WebM fixture acceptance. Diagnostic only."""
import pathlib,json,subprocess,runpy
root=pathlib.Path('diagnostic-output')
# Import H's proven patcher (its existing 3s diagnostic gate runs as well).
patch=runpy.run_path('scripts/rfdr-d4-6-5h-padding-prototype.py')['replace_last_audio']
def run(*args):
 p=subprocess.run(args,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')[-2500:])
 return p.stdout
for label in ('normal','stress'):
 original=root/f'd4-6-5k-{label}.webm'
 corrected=root/f'd4-6-5k-{label}-corrected.webm'
 blob,details=patch(original.read_bytes())
 corrected.write_bytes(blob)
 probe=json.loads(run('ffprobe','-v','error','-show_streams','-show_packets','-of','json',str(corrected)))
 audio=next(s for s in probe['streams'] if s['codec_name']=='opus')
 video=next(s for s in probe['streams'] if s['codec_name']=='vp8')
 packets=[p for p in probe['packets'] if p['stream_index']==audio['index']]
 vpts=[float(p['pts_time']) for p in probe['packets'] if p['stream_index']==video['index']]
 raw=run('ffmpeg','-v','error','-i',str(corrected),'-map','0:v:0','-pix_fmt','rgb24','-f','rawvideo','-')
 original_raw=run('ffmpeg','-v','error','-i',str(original),'-map','0:v:0','-pix_fmt','rgb24','-f','rawvideo','-')
 pcm=run('ffmpeg','-v','error','-i',str(corrected),'-map','0:a:0','-ar','48000','-ac','1','-f','f32le','-')
 stride=320*180*3
 def color(i):
  offset=i*stride+(90*320+160)*3
  return list(raw[offset:offset+3])
 report={'label':label,'audio_samples':len(pcm)//4,'video_frames':len(raw)//stride,'video_unchanged':raw==original_raw,'max_pts_gap':max(y-x for x,y in zip(vpts,vpts[1:])),'last_audio_side_data':packets[-1].get('side_data_list',[]),'colors':{str(i):color(i) for i in (24,33,36,78,87,90,120)},'patch':details}
 (root/f'd4-6-5k-{label}-acceptance.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2))
 assert report['audio_samples']==288000,f'{label}: wrong 6s audio duration'
 assert report['video_frames']==144 and report['video_unchanged'],f'{label}: video changed'
 assert report['max_pts_gap']<=0.043,f'{label}: timestamp drift'
 c=report['colors']
 assert c['24'][0]>c['24'][2] and c['36'][2]>c['36'][0],f'{label}: first dissolve endpoints'
 assert c['33'][0]>25 and c['33'][2]>25,f'{label}: first dissolve blend missing'
 assert c['78'][2]>c['78'][1] and c['90'][1]>c['90'][2],f'{label}: second dissolve endpoints'
 assert c['87'][1]>25 and c['87'][2]>25,f'{label}: second dissolve blend missing'
 assert any('discard' in str(x).lower() or 'skip' in str(x).lower() for x in report['last_audio_side_data']),f'{label}: trim metadata missing'
print('D4.6.5K extended-duration normal/stress acceptance PASS; silent and Electron scenarios pending.')
