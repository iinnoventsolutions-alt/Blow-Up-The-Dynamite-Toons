#!/usr/bin/env python3
"""RFDR D4.3: analyze encoded dissolve timing without changing production code."""
import csv,json,subprocess,sys
from pathlib import Path
video=Path(sys.argv[1] if len(sys.argv)>1 else 'test-results/audio-animatic.webm')
out=Path(sys.argv[2] if len(sys.argv)>2 else 'diagnostic-output')
out.mkdir(parents=True,exist_ok=True)
if not video.exists():
    print('Missing export video',file=sys.stderr);sys.exit(2)
def run(*args):
    return subprocess.check_output(args,stderr=subprocess.PIPE)
meta=json.loads(run('ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)))
raw=run('ffprobe','-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time,pict_type','-of','csv=p=0',str(video)).decode()
frames=[]
for row in csv.reader(raw.splitlines()):
    try: frames.append(float(row[0]))
    except (IndexError,ValueError): pass
# At a fixed output sampling rate, extract 1x1 RGB frames. Unlike the
# existing regression, classify where the dissolve appears on the timeline.
rgb=run('ffmpeg','-v','error','-i',str(video),'-vf','fps=24,scale=1:1','-pix_fmt','rgb24','-f','rawvideo','-')
samples=[]
for i in range(0,len(rgb)-2,3):
    r,g,b=rgb[i:i+3]
    t=i/3/24
    samples.append(dict(time=round(t,4),r=r,g=g,b=b,blend=(r>35 and b>35)))
blend=[s['time'] for s in samples if s['blend']]
gaps=[round(b-a,4) for a,b in zip(frames,frames[1:])]
duration=float(meta.get('format',{}).get('duration',0))
# Reference window is derived from the existing ui-audio 24fps test:
# red-to-blue dissolve expected around 0.75-1.0 seconds.
result=dict(file=str(video),duration=duration,encoded_frames=len(frames),max_frame_gap=max(gaps,default=0),blended_frame_count=len(blend),first_blend=blend[0] if blend else None,last_blend=blend[-1] if blend else None,blend_in_expected_window=sum(.75<=t<=1.0 for t in blend),blend_after_1_2=sum(t>1.2 for t in blend),video_streams=[dict(codec=s.get('codec_name'),avg_frame_rate=s.get('avg_frame_rate'),duration=s.get('duration')) for s in meta.get('streams',[]) if s.get('codec_type')=='video'],audio_streams=[dict(codec=s.get('codec_name'),duration=s.get('duration'),start_time=s.get('start_time')) for s in meta.get('streams',[]) if s.get('codec_type')=='audio'])
(out/'timeline.json').write_text(json.dumps(result,indent=2))
(out/'samples.json').write_text(json.dumps(samples,indent=2))
(out/'encoded-frames.csv').write_text(raw)
print(json.dumps(result,indent=2))
# Diagnostic mode: report timing violations but do not hide evidence behind
# a successful browser assertion or declare a production fix validated.
if not blend or not any(.75<=t<=1.0 for t in blend):
    print('TIMELINE WARNING: expected dissolve window has no blended frames')
if any(t>1.2 for t in blend):
    print('TIMELINE WARNING: dissolve is still visible after 1.2 seconds')
# D4.4 acceptance contract: an encoded dissolve must occupy its intended
# timeline window. The previous existence-only test accepted a 500ms delay.
# Keep this opt-in so D4.3's diagnostic can still collect non-gating evidence.
if '--strict' in sys.argv:
    if not blend or not any(.75<=t<=1.0 for t in blend) or any(t>1.2 for t in blend):
        print('D4.4 TIMING CONTRACT FAIL: encoded dissolve timing drift',file=sys.stderr)
        sys.exit(1)
    print('D4.4 TIMING CONTRACT PASS')
