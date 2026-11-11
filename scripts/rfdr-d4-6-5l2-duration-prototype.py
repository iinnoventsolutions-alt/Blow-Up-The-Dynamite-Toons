#!/usr/bin/env python3
"""D4.6.5L.2 isolated EBML Info.Duration experiment (not production code).

WebM Duration is expressed in TimestampScale units, normally milliseconds.
Patch existing float in place; do not move clusters, cues or seek offsets.
"""
import pathlib,struct,json,subprocess
from importlib.machinery import SourceFileLoader
# Reuse EBML parser definitions without importing executable diagnostic modules.
def vint(b,p,mask=True):
 first=b[p]
 width=next((n for n in range(1,9) if first&(1<<(8-n))),None)
 if width is None or p+width>len(b):raise ValueError('Invalid VINT')
 raw=int.from_bytes(b[p:p+width],'big')
 return (raw&((1<<(7*width))-1) if mask else raw),width
def children(b,start,end):
 p=start
 while p<end:
  eid,il=vint(b,p,False);size,sl=vint(b,p+il)
  body=p+il+sl;stop=body+size
  if stop>end or stop<=p:raise ValueError('Malformed EBML element')
  yield eid,body,stop
  p=stop
root=pathlib.Path('diagnostic-output')
for label in ('normal','stress'):
 src=root/f'd4-6-5l-{label}.webm'
 out=root/f'd4-6-5l2-{label}-duration.webm'
 b=bytearray(src.read_bytes())
 segments=[(a,z) for eid,a,z in children(b,0,len(b)) if eid==0x18538067]
 assert len(segments)==1
 infos=[(a,z) for eid,a,z in children(b,*segments[0]) if eid==0x1549a966]
 assert len(infos)==1
 info=list(children(b,*infos[0]))
 scales=[int.from_bytes(b[a:z],'big') for eid,a,z in info if eid==0x2ad7b1]
 scale=scales[0] if scales else 1000000
 durations=[(a,z) for eid,a,z in info if eid==0x4489]
 assert len(durations)==1,'Duration element absent or ambiguous'
 a,z=durations[0];width=z-a
 assert width in (4,8),'Duration must be float32 or float64'
 fmt='>f' if width==4 else '>d'
 original=struct.unpack(fmt,b[a:z])[0]
 desired=6.0*1e9/scale
 b[a:z]=struct.pack(fmt,desired)
 out.write_bytes(b)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(out)]))
 observed=float(probe['format']['duration'])
 report={'case':label,'timestamp_scale_ns':scale,'original_duration_units':original,'patched_duration_units':desired,'observed_seconds':observed,'byte_length_unchanged':len(b)==src.stat().st_size,'streams':[s['codec_name'] for s in probe['streams']]}
 (root/f'd4-6-5l2-{label}-duration.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2))
 assert abs(observed-6.0)<0.002 and report['byte_length_unchanged']
 assert report['streams']==['vp8']
print('D4.6.5L.2 in-place duration metadata prototype PASS; playback verification still required.')
