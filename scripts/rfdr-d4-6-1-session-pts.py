#!/usr/bin/env python3
"""Validate session-scoped frame telemetry and report actual encoded PTS."""
import json,re,sys,statistics,subprocess
from pathlib import Path
log=Path(sys.argv[1]).read_text(errors='replace')
events=[]
for m in re.finditer(r'\[RFDR-D45\] (\{[^\n]*\})',log):
    try: events.append(json.loads(m.group(1)))
    except json.JSONDecodeError: pass
starts=[e for e in events if e.get('kind')=='start']
if not starts: sys.exit('Missing export-session start telemetry')
session=starts[-1]['session']
frames=[e for e in events if e.get('kind')=='frame' and e.get('session')==session]
if not frames: sys.exit('Missing frame telemetry for last export session')
indices=[e['frame'] for e in frames]
if indices!=list(range(len(indices))): sys.exit(f'Noncontiguous or duplicated frame indices in session {session}: {indices}')
probe=subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time,pkt_duration_time','-of','json',sys.argv[2]],capture_output=True,text=True,check=True)
encoded=json.loads(probe.stdout)['frames']
pts=[float(f['best_effort_timestamp_time']) for f in encoded if f.get('best_effort_timestamp_time') not in (None,'N/A')]
if len(pts)<2: sys.exit('Insufficient encoded video PTS')
if any(b<a for a,b in zip(pts,pts[1:])): sys.exit('Nonmonotonic encoded video timestamps')
timeline=json.loads(Path(sys.argv[3]).read_text())
delays=[e['delay'] for e in frames]
report={'session':session,'session_count':len(starts),'submission_count':len(frames),'first_frame':indices[0],'last_frame':indices[-1],'submission_delay_median':statistics.median(delays),'submission_delay_max':max(delays),'submission_over_100ms':sum(d>.1 for d in delays),'encoded_pts_count':len(pts),'encoded_pts_first':pts[0],'encoded_pts_last':pts[-1],'encoded_pts_max_gap':max(b-a for a,b in zip(pts,pts[1:])),'encoded_pts_sample':pts[:12],'encoded_first_blend':timeline.get('first_blend'),'encoded_last_blend':timeline.get('last_blend'),'strict_timing_pass':bool(timeline.get('blend_in_expected_window') and not timeline.get('blend_after_1_2'))}
Path(sys.argv[4]).write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
