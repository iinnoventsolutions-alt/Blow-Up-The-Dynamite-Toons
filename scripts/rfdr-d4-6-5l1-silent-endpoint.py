#!/usr/bin/env python3
"""D4.6.5L.1: report exact last-frame and container duration; no production mutation."""
import json,pathlib,subprocess
root=pathlib.Path('diagnostic-output')
for label in ('normal','stress'):
 p=root/f'd4-6-5l-{label}.webm'
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_packets','-select_streams','v:0','-of','json',str(p)]))
 packets=data['packets']
 last=packets[-1]
 duration=float(data['format']['duration'])
 last_pts=float(last['pts_time'])
 frame_interval=1/24
 report={'case':label,'container_duration':duration,'last_video_pts':last_pts,'last_packet_duration':last.get('duration_time'),'expected_presentation_end':6.0,'expected_frame_interval':frame_interval,'missing_end_duration_seconds':round(6-duration,6),'last_pts_plus_frame_interval':round(last_pts+frame_interval,6)}
 (root/f'd4-6-5l1-duration-{label}.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2))
 assert len(packets)==144
 assert abs(last_pts-143/24)<0.003
 assert abs(duration-last_pts)<0.003
print('D4.6.5L.1 silent endpoint diagnostic PASS: last-frame presentation duration not represented by container.')
