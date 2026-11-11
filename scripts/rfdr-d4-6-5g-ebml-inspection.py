#!/usr/bin/env python3
"""D4.6.5G: inspect EBML blocks and calculate Opus end-padding feasibility.
Read-only; does not claim to fix padding. Emits evidence for a targeted BlockGroup experiment.
"""
import pathlib,json,struct
root=pathlib.Path('diagnostic-output')
IDS={0x1f43b675:'Cluster',0xa3:'SimpleBlock',0xa0:'BlockGroup',0xa1:'Block',0x75a2:'DiscardPadding',0x18538067:'Segment',0x1549a966:'Info',0x1654ae6b:'Tracks',0x1c53bb6b:'Cues',0xec:'Void',0xbf:'CRC32'}
MASTERS={0x1a45dfa3,0x18538067,0x1549a966,0x1654ae6b,0x1f43b675,0xa0,0x1c53bb6b,0x114d9b74,0xae,0x6d80,0x6240,0x5034,0x5035,0xe0,0xe1}
def vint(buf,pos,mask=True):
 if pos>=len(buf):raise ValueError('EOF')
 b=buf[pos];length=next((i for i in range(1,9) if b&(1<<(8-i))),None)
 if length is None or pos+length>len(buf):raise ValueError('invalid EBML vint')
 raw=int.from_bytes(buf[pos:pos+length],'big')
 val=raw & ((1<<(7*length))-1) if mask else raw
 unknown=mask and val==(1<<(7*length))-1
 return val,length,unknown
def scan(buf,start,end,depth=0):
 p=start
 while p<end:
  try:
   eid,ilen,_=vint(buf,p,False);size,slen,unknown=vint(buf,p+ilen)
  except ValueError:break
  payload=p+ilen+slen
  finish=end if unknown else min(end,payload+size)
  if finish<=p or payload>len(buf):break
  yield eid,p,payload,finish,depth
  if eid in MASTERS and depth<8:
   yield from scan(buf,payload,finish,depth+1)
  p=finish
for label in ('normal','stress'):
 data=(root/f'd4-6-5c-{label}.webm').read_bytes()
 elements=list(scan(data,0,len(data)))
 counts={name:sum(eid==key for eid,*_ in elements) for key,name in IDS.items()}
 blocks=[]
 for eid,offset,payload,finish,depth in elements:
  if eid not in (0xa3,0xa1):continue
  try:
   track,n,_=vint(data,payload)
   relative=struct.unpack('>h',data[payload+n:payload+n+2])[0]
   flags=data[payload+n+2]
   blocks.append({'kind':IDS[eid],'offset':offset,'track':track,'relative_timecode':relative,'flags':flags,'payload_bytes':finish-payload})
  except (ValueError,struct.error,IndexError):continue
 report={'case':label,'file_bytes':len(data),'element_counts':counts,'block_count':len(blocks),'last_blocks':blocks[-8:],'required_trim_samples':648,'required_trim_nanoseconds':13500000,'feasibility':'Read-only EBML inventory; an Opus DiscardPadding element must be validated with a decoder before any production use.'}
 (root/f'd4-6-5g-ebml-{label}.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2))
