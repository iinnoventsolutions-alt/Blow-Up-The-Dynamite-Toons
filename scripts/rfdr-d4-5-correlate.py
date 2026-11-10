#!/usr/bin/env python3
"""Summarize storyboard submission drift alongside encoded frame timing."""
import json,re,sys
from pathlib import Path
log=Path(sys.argv[1]).read_text(errors='replace')
events=[]
for match in re.finditer(r'\[RFDR-D45\] (\{[^\n]*\})',log):
    try:
        obj=json.loads(match.group(1))
        if obj.get('kind')=='frame':events.append(obj)
    except json.JSONDecodeError:pass
if not events:\n    print('D4.5.1 TELEMETRY FAILURE: no frame submission events found in browser log',file=sys.stderr)\n    sys.exit(3)\nencoded=json.loads(Path(sys.argv[2]).read_text())
delays=sorted(e['delay'] for e in events)
summary=dict(submissions=len(events),first_frame=events[0]['frame'] if events else None,last_frame=events[-1]['frame'] if events else None,missing_submission_indices=sum(max(0,b['frame']-a['frame']-1) for a,b in zip(events,events[1:])),submission_delay_max=max(delays,default=None),submission_delay_median=delays[len(delays)//2] if delays else None,submission_delay_over_100ms=sum(d>.1 for d in delays),encoded_frames=encoded['encoded_frames'],encoded_max_gap=encoded['max_frame_gap'],encoded_first_blend=encoded['first_blend'],encoded_last_blend=encoded['last_blend'],strict_timing_pass=bool(encoded['blend_in_expected_window'] and not encoded['blend_after_1_2']))
print(json.dumps(summary,indent=2))\nif summary['missing_submission_indices']:\n    print('WARNING: frame indices skipped in captured telemetry',file=sys.stderr)
Path(sys.argv[3]).write_text(json.dumps(summary,indent=2))
