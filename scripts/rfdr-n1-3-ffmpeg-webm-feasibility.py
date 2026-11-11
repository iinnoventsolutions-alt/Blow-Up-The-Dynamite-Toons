#!/usr/bin/env python3
"""N1.3 isolated FFmpeg WebM VP8/Opus proof; no production integration."""
import json,math,os,pathlib,struct,subprocess,wave
FFMPEG=os.environ.get('RFDR_FFMPEG_BIN','ffmpeg')
root=pathlib.Path('diagnostic-output');root.mkdir(exist_ok=True)
W,H,FPS,FRAMES,RATE,SAMPLES=320,180,24,144,48000,288000
def run(args):
 return subprocess.run(args,check=True,capture_output=True,text=True)
results=[]
for audio in (False,True):
 for stress in (False,True):
  label=f"n1-3-{'audio' if audio else 'silent'}-{'stress' if stress else 'normal'}"
  raw=root/(label+'.rgb'); wav=root/(label+'.wav'); output=root/(label+'.webm')
  with raw.open('wb') as f:
   for i in range(FRAMES):
    t=i/FPS;blend=max(0,min(1,(t-2.75)/0.25))
    pixel=bytes((round(255*(1-blend)),0,round(255*blend)))
    f.write(pixel*(W*H))
  if audio:
   with wave.open(str(wav),'wb') as w:
    w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE)
    # 3 seconds tone, 3 seconds silence; deterministic sample count.
    for start in range(0,SAMPLES,4096):
     block=bytearray()
     for i in range(start,min(start+4096,SAMPLES)):
      value=int(5000*math.sin(2*math.pi*440*i/RATE)) if i<RATE*3 else 0
      block.extend(struct.pack('<h',value))
     w.writeframesraw(block)
  cmd=[FFMPEG,'-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{W}x{H}','-framerate',str(FPS),'-i',str(raw)]
  if audio:cmd+=['-i',str(wav)]
  cmd+=['-map','0:v:0']
  if audio:cmd+=['-map','1:a:0']
  cmd+=['-c:v','libvpx','-b:v','500k','-deadline','realtime','-cpu-used','6','-g','24']
  if audio:cmd+=['-c:a','libopus','-b:a','64k','-ar','48000','-ac','1']
  else:cmd+=['-an']
  cmd+=['-t','6','-f','webm',str(output)]
  run(cmd)
  probe=json.loads(run(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(output)]).stdout)
  video=next(s for s in probe['streams'] if s['codec_type']=='video')
  assert video['codec_name']=='vp8' and int(video['nb_read_frames'])==FRAMES,(label,video)
  assert len(probe['streams'])==(2 if audio else 1)
  duration=float(probe['format']['duration'])
  assert abs(duration-6)<0.05,(label,duration)
  samples=None
  if audio:
   assert next(s for s in probe['streams'] if s['codec_type']=='audio')['codec_name']=='opus'
   decoded=subprocess.run([FFMPEG,'-v','error','-i',str(output),'-map','0:a:0','-ar','48000','-ac','1','-f','s16le','-'],check=True,capture_output=True).stdout
   samples=len(decoded)//2
   assert samples==SAMPLES,(label,samples)
  result={'case':label,'duration':duration,'video_frames':int(video['nb_read_frames']),'audio_samples':samples,'bytes':output.stat().st_size}
  results.append(result);print(json.dumps(result),flush=True)
(root/'n1-3-ffmpeg-results.json').write_text(json.dumps(results,indent=2))
print('N1.3 FFmpeg WebM VP8/Opus strict sample-duration proof PASS; packaging and licensing not evaluated.')
