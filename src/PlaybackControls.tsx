import { timecode } from './model';
export default function PlaybackControls({frame,total,fps,playing,onToggle,onSeek,onStop,label}:{frame:number;total:number;fps:number;playing:boolean;onToggle:()=>void;onSeek:(n:number)=>void;onStop:()=>void;label:string}){
 return <div className="timeline-transport stage-playback" aria-label={label}><button title="Go to start" onClick={()=>onSeek(0)}>|‹</button><button title="Previous frame" onClick={()=>onSeek(frame-1)}>‹</button><button className="primary" onClick={onToggle}>{playing?'Pause':'Play'}</button><button title="Stop playback" onClick={onStop}>■</button><button title="Next frame" onClick={()=>onSeek(frame+1)}>›</button><span>{timecode(frame,fps)} / {timecode(total,fps)}</span></div>;
}
