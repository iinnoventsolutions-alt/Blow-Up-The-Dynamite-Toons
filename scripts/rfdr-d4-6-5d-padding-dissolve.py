#!/usr/bin/env python3
"""D4.6.5D: inspect Opus padding metadata and verify decoded dissolve frames.
Diagnostic first: strict audio-sample acceptance intentionally fails until muxing is corrected.
"""
import json, subprocess, pathlib, sys
root=pathlib.Path('diagnostic-output')
def run(*args):
 return subprocess.check_output(args,stderr=subprocess.PIPE)
all_reports=[]
for label in ('normal','stress'):
 path=root/f'd4-6-5c-{label}.webm'
 probe=json.loads(run('ffprobe','-v','error','-show_streams','-show_packets','-show_format','-of','json',str(path)))
 audio_stream=next(s for s in probe['streams'] if s['codec_name']=='opus')
 audio_packets=[p for p in probe['packets'] if p['stream_index']==audio_stream['index']]
 first=audio_packets[0] if audio_packets else {}
 last=audio_packets[-1] if audio_packets else {}
 decoded=run('ffmpeg','-v','error','-i',str(path),'-map','0:v:0','-vsync','0','-f','rawvideo','-pix_fmt','rgb24','-')
 width=320;height=180;stride=width*height*3
 frames=len(decoded)//stride
 samples=[]
 for i in (12,18,21,24,27,30,36):
  if i>=frames: continue
  pixel=(i*stride+(height//2*width+width//2)*3)
  samples.append({'frame':i,'time_seconds':i/24,'rgb':list(decoded[pixel:pixel+3])})
 audio_bytes=run('ffmpeg','-v','error','-i',str(path),'-map','0:a:0','-ar','48000','-ac','1','-f','f32le','-')
 decoded_samples=len(audio_bytes)//4
 report={'case':label,'audio_codec_delay':audio_stream.get('codec_delay'),'audio_initial_padding':audio_stream.get('initial_padding'),'audio_start_time':audio_stream.get('start_time'),'audio_duration':audio_stream.get('duration'),'audio_extradata_size':audio_stream.get('extradata_size'),'first_audio_packet':{k:first.get(k) for k in ('pts_time','duration_time','side_data_list')},'last_audio_packet':{k:last.get(k) for k in ('pts_time','duration_time','side_data_list')},'audio_packet_count':len(audio_packets),'decoded_audio_samples':decoded_samples,'expected_audio_samples':144000,'excess_samples':decoded_samples-144000,'decoded_video_frames':frames,'center_pixel_samples':samples}
 (root/f'd4-6-5d-{label}.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2))
 assert frames==72,f'{label}: unexpected video frame count'
 assert samples[0]['rgb'][0]>samples[0]['rgb'][2],f'{label}: early frame not red'
 assert samples[-1]['rgb'][2]>samples[-1]['rgb'][0],f'{label}: late frame not blue'
 assert any(p['rgb'][0]>25 and p['rgb'][2]>25 for p in samples if 0.75<p['time_seconds']<1.0),f'{label}: dissolve blend missing'
 all_reports.append(report)
(root/'d4-6-5d-summary.json').write_text(json.dumps(all_reports,indent=2))
if any(r['decoded_audio_samples']!=144000 for r in all_reports):
 print('D4.6.5D strict gate FAIL: WebM Opus end padding is not yet represented accurately.',file=sys.stderr)
 sys.exit(1)
print('D4.6.5D strict audio and dissolve gate PASS')
