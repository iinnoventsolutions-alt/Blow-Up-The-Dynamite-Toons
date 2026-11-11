#!/usr/bin/env python3
"""D4.6.5E isolated Opus trim feasibility: preserve original muxed file; test stream-copy remux.
Never count post-decode trimming as a muxer fix.
"""
import json,subprocess,pathlib,sys
root=pathlib.Path('diagnostic-output')
def run(args):
 p=subprocess.run(args,capture_output=True,text=True)
 return {'returncode':p.returncode,'stdout':p.stdout,'stderr':p.stderr[-3000:]}
reports=[]
for label in ('normal','stress'):
 source=root/f'd4-6-5c-{label}.webm'
 remux=root/f'd4-6-5e-{label}-streamcopy.webm'
 result=run(['ffmpeg','-hide_banner','-y','-loglevel','warning','-i',str(source),'-map','0','-c','copy',str(remux)])
 report={'case':label,'streamcopy':result,'original_samples':144648}
 if result['returncode']==0:
  for kind,path in [('source',source),('streamcopy',remux)]:
   probe=run(['ffprobe','-v','error','-show_entries','stream=index,codec_name,initial_padding,start_time,duration:packet=stream_index,pts_time,duration_time,side_data_list','-of','json',str(path)])
   decoded=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-map','0:a:0','-ar','48000','-ac','1','-f','f32le','-'],capture_output=True)
   report[kind]={'probe':json.loads(probe['stdout']) if probe['returncode']==0 else probe,'decoded_samples':len(decoded.stdout)//4,'decode_exit':decoded.returncode,'decode_stderr':decoded.stderr.decode(errors='replace')[-1000:]}
 reports.append(report)
 print(json.dumps({'case':label,'streamcopy_exit':result['returncode'],'source_samples':report.get('source',{}).get('decoded_samples'),'remux_samples':report.get('streamcopy',{}).get('decoded_samples')},indent=2))
(root/'d4-6-5e-streamcopy-investigation.json').write_text(json.dumps(reports,indent=2))
print('D4.6.5E investigation only: stream copy is not a padding correction; strict D4.6.5D gate remains authoritative.')
