#!/usr/bin/env python3
"""D4.6.5H experimental WebM BlockGroup/DiscardPadding conversion.

Only replaces the final Opus SimpleBlock; reserializes affected EBML ancestor
sizes, preserving unknown-size headers and all encoded media payloads.
This is a diagnostic artifact, NOT production muxing code.
"""
import pathlib,json,subprocess
ROOT=pathlib.Path('diagnostic-output')
CLUSTER=0x1f43b675
SEGMENT=0x18538067
SIMPLE=0xa3
BLOCKGROUP=0xa0
BLOCK=0xa1
PADDING=0x75a2
def vint(data,pos,mask=True):
 b=data[pos];n=next((i for i in range(1,9) if b & (1<<(8-i))),None)
 if n is None or pos+n>len(data):raise ValueError('Invalid EBML VINT')
 raw=int.from_bytes(data[pos:pos+n],'big')
 val=raw&((1<<(7*n))-1) if mask else raw
 return val,n,mask and val==(1<<(7*n))-1
def size_bytes(value,width):
 if value >= (1<<(7*width))-1:raise ValueError('EBML size exceeds width')
 return ((1<<(7*width))|value).to_bytes(width,'big')
def encode_size(value):
 for n in range(1,9):
  if value < (1<<(7*n))-1:return size_bytes(value,n)
 raise ValueError('oversize')
def elem(eid,payload):
 n=max(1,(eid.bit_length()+7)//8)
 return eid.to_bytes(n,'big')+encode_size(len(payload))+payload
def scan(data,start,end):
 p=start
 while p<end:
  eid,il,_=vint(data,p,False)
  length,sl,unknown=vint(data,p+il)
  body=p+il+sl
  stop=end if unknown else body+length
  if stop>end or stop<=p:raise ValueError('Malformed element boundaries')
  yield eid,p,body,stop,il,sl,unknown
  p=stop
def replace_last_audio(data):
 # Locate last audio block by track VINT, preserving all other blocks verbatim.
 segments=[x for x in scan(data,0,len(data)) if x[0]==SEGMENT]
 if len(segments)!=1:raise ValueError('Expected exactly one Segment')
 seg=segments[0]
 clusters=[x for x in scan(data,seg[2],seg[3]) if x[0]==CLUSTER]
 candidates=[]
 for cluster in clusters:
  for x in scan(data,cluster[2],cluster[3]):
   if x[0]!=SIMPLE:continue
   track,_,_=vint(data,x[2])
   if track==2:candidates.append((cluster,x))
 if not candidates:raise ValueError('No Opus SimpleBlock')
 cluster,last=candidates[-1]
 original_payload=data[last[2]:last[3]]
 # Matroska DiscardPadding: signed nanoseconds; positive trims block end.
 block_group=elem(BLOCKGROUP,elem(BLOCK,original_payload)+elem(PADDING,(13500000).to_bytes(8,'big',signed=True)))
 cluster_body=data[cluster[2]:last[1]]+block_group+data[last[3]:cluster[3]]
 cluster_header=data[cluster[1]:cluster[1]+cluster[4]]
 cluster_size=(data[cluster[1]+cluster[4]:cluster[2]] if cluster[6] else size_bytes(len(cluster_body),cluster[5]))
 new_cluster=cluster_header+cluster_size+cluster_body
 seg_body=data[seg[2]:cluster[1]]+new_cluster+data[cluster[3]:seg[3]]
 seg_header=data[seg[1]:seg[1]+seg[4]]
 seg_size=(data[seg[1]+seg[4]:seg[2]] if seg[6] else size_bytes(len(seg_body),seg[5]))
 output=data[:seg[1]]+seg_header+seg_size+seg_body+data[seg[3]:]
 return output,{'original_last_audio_payload_bytes':len(original_payload),'replacement_bytes':len(block_group),'last_audio_track':2,'padding_ns':13500000,'segment_unknown_size':seg[6],'cluster_unknown_size':cluster[6]}
def execute(cmd):
 p=subprocess.run(cmd,capture_output=True,text=True)
 return {'exit':p.returncode,'stdout':p.stdout,'stderr':p.stderr[-3000:]}
def decoded_samples(path):
 p=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-map','0:a:0','-ar','48000','-ac','1','-f','f32le','-'],capture_output=True)
 return {'exit':p.returncode,'samples':len(p.stdout)//4,'stderr':p.stderr.decode(errors='replace')[-1000:]}
all_ok=True
for label in ('normal','stress'):
 src=ROOT/f'd4-6-5c-{label}.webm'
 out=ROOT/f'd4-6-5h-{label}-padding.webm'
 modified,details=replace_last_audio(src.read_bytes())
 out.write_bytes(modified)
 probe=execute(['ffprobe','-v','error','-show_entries','packet=stream_index,pts_time,duration_time,side_data_list','-of','json',str(out)])
 decoded=decoded_samples(out)
 video=execute(['ffprobe','-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=nb_read_frames','-of','json',str(out)])
 report={'case':label,'patch':details,'original_bytes':src.stat().st_size,'patched_bytes':len(modified),'decoded_audio':decoded,'video_probe':video,'packet_probe':probe}
 (ROOT/f'd4-6-5h-{label}-result.json').write_text(json.dumps(report,indent=2))
 print(json.dumps({'case':label,'decoded_samples':decoded['samples'],'decode_exit':decoded['exit'],'video_probe':video,'packet_probe_exit':probe['exit']},indent=2))
 if decoded['exit']!=0 or decoded['samples']!=144000 or video['exit']!=0 or '72' not in video['stdout'] or probe['exit']!=0:all_ok=False
if not all_ok:raise SystemExit('D4.6.5H experimental strict validation FAIL; inspect artifacts.')
print('D4.6.5H experimental strict audio and video frame counts PASS; production suitability NOT established.')
