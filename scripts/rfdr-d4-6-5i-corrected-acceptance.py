#!/usr/bin/env python3
"""D4.6.5I corrected-container strict acceptance; original baseline remains a negative control."""
import json,pathlib,subprocess,sys
root=pathlib.Path('diagnostic-output')
def run(*args):
 p=subprocess.run(args,capture_output=True)
 if p.returncode:raise RuntimeError(f'{args}: {p.stderr.decode(errors="replace")[-3000:]}')
 return p.stdout
reports=[]
for label in ('normal','stress'):
 path=root/f'd4-6-5h-{label}-padding.webm'
 original=root/f'd4-6-5c-{label}.webm'
 probe=json.loads(run('ffprobe','-v','error','-show_streams','-show_packets','-of','json',str(path)))
 a=next(s for s in probe['streams'] if s['codec_name']=='opus')
 v=next(s for s in probe['streams'] if s['codec_name']=='vp8')
 packets=[p for p in probe['packets'] if p['stream_index']==a['index']]
 side=packets[-1].get('side_data_list',[]) if packets else []
 pcm=run('ffmpeg','-v','error','-i',str(path),'-map','0:a:0','-ar','48000','-ac','1','-f','f32le','-')
 orig_pcm=run('ffmpeg','-v','error','-i',str(original),'-map','0:a:0','-ar','48000','-ac','1','-f','f32le','-')
 video=run('ffmpeg','-v','error','-i',str(path),'-map','0:v:0','-f','rawvideo','-pix_fmt','rgb24','-')
 orig_video=run('ffmpeg','-v','error','-i',str(original),'-map','0:v:0','-f','rawvideo','-pix_fmt','rgb24','-')
 stride=320*180*3
 frames=len(video)//stride
 def center(i):
  pos=i*stride+(90*320+160)*3
  return list(video[pos:pos+3])
 rgb={str(i):center(i) for i in (12,18,21,24,27,30,36)}
 timestamps=[float(p['pts_time']) for p in probe['packets'] if p['stream_index']==v['index']]
 report={'case':label,'audio_samples':len(pcm)//4,'original_audio_samples':len(orig_pcm)//4,'video_frames':frames,'video_bit_exact':video==orig_video,'video_pts_monotonic':all(y>x for x,y in zip(timestamps,timestamps[1:])),'video_pts_max_gap':max((y-x for x,y in zip(timestamps,timestamps[1:])),default=None),'audio_packets':len(packets),'last_audio_side_data':side,'center_rgb':rgb}
 reports.append(report)
 (root/f'd4-6-5i-{label}.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2))
 assert report['audio_samples']==144000,f'{label}: corrected decoded sample count incorrect'
 assert report['original_audio_samples']==144648,f'{label}: negative control changed'
 assert frames==72 and report['video_bit_exact'],f'{label}: video frames changed'
 assert report['video_pts_monotonic'] and report['video_pts_max_gap']<=0.043,f'{label}: video timestamp discontinuity'
 assert rgb['12'][0]>rgb['12'][2] and rgb['36'][2]>rgb['36'][0],f'{label}: endpoint colors'
 assert rgb['21'][0]>25 and rgb['21'][2]>25,f'{label}: dissolve missing at 0.875s'
 assert rgb['18'][0]>rgb['18'][2] and rgb['24'][2]>rgb['24'][0],f'{label}: dissolve boundary mismatch'
 assert any('discard' in str(x).lower() or 'skip' in str(x).lower() for x in side),f'{label}: FFprobe does not expose end trim side data'
(root/'d4-6-5i-summary.json').write_text(json.dumps(reports,indent=2))
print('D4.6.5I corrected-container strict acceptance PASS; browser playback and production suitability remain unverified.')
