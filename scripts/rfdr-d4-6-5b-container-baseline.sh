#!/usr/bin/env bash
# D4.6.5B: isolated WebM container baseline. This does NOT yet mux WebCodecs chunks.
set -euo pipefail
mkdir -p diagnostic-output
out=diagnostic-output/d4-6-5b-container-baseline.webm
# Deterministic 72-frame, 24fps red-to-blue transition; 3s of 48kHz audio.
ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "color=c=red:s=320x180:r=24:d=3" \
  -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=3" \
  -filter_complex "[0:v]format=yuv420p,fade=t=out:st=0.75:d=0.25:color=blue[v]" \
  -map "[v]" -map 1:a -frames:v 72 -c:v libvpx -b:v 500k \
  -c:a libopus -b:a 64k -ar 48000 -ac 1 -shortest "$out"
ffprobe -v error -show_entries stream=index,codec_type,codec_name,sample_rate,nb_frames,duration -show_entries format=duration -of json "$out" > diagnostic-output/d4-6-5b-streams.json
ffprobe -v error -select_streams v:0 -show_entries frame=best_effort_timestamp_time -of csv=p=0 "$out" > diagnostic-output/d4-6-5b-video-pts.txt
ffprobe -v error -select_streams a:0 -show_entries packet=pts_time,duration_time,side_data_list -of json "$out" > diagnostic-output/d4-6-5b-audio-packets.json
ffmpeg -hide_banner -loglevel error -i "$out" -map 0:a:0 -f f32le -ac 1 -ar 48000 -y diagnostic-output/d4-6-5b-audio.f32
python3 - <<'PY'
import json,os,statistics
from pathlib import Path
p=Path('diagnostic-output')
streams=json.loads((p/'d4-6-5b-streams.json').read_text())
video=[float(x.strip()) for x in (p/'d4-6-5b-video-pts.txt').read_text().splitlines() if x.strip()]
audio=json.loads((p/'d4-6-5b-audio-packets.json').read_text())
samples=(p/'d4-6-5b-audio.f32').stat().st_size//4
gaps=[b-a for a,b in zip(video,video[1:])]
result={'container':'webm','video_frames':len(video),'video_first_pts':video[0] if video else None,'video_last_pts':video[-1] if video else None,'video_gap_min':min(gaps) if gaps else None,'video_gap_max':max(gaps) if gaps else None,'audio_decoded_samples':samples,'audio_duration_seconds':samples/48000,'container_duration':float(streams['format']['duration']),'streams':streams['streams'],'audio_packets':len(audio['packets'])}
(p/'d4-6-5b-validation.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
assert len(video)==72, 'Expected 72 decoded VP8 frames'
assert all(0.040<=x<=0.043 for x in gaps),'Unexpected video PTS gaps'
assert samples==144000,'Expected precisely 3s of decoded audio'
assert abs(float(streams['format']['duration'])-3)<0.06,'Unexpected container duration'
assert {s['codec_name'] for s in streams['streams']}=={'vp8','opus'}
PY
