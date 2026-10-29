import AudioLanes, { type AudioSelection } from './AudioLanes';
import { audioEnd } from './audio-model';
import PlaybackPreview from './PlaybackPreview';
import TransitionMarker from './TransitionMarker';
import { sceneStart } from './camera';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { allPanels, panelStart, projectFrames, secondsText, timecode, type Project } from './model';
import { Thumbnail } from './Canvas';
type Resize = { id: string; startX: number; original: number; scale: number; frames: number };
export default function TimelineWorkspace({ audioSelection,onAudioSelect,onAudioEdit,transitionId,onTransition,project, activeId, playFrame, playing, onTogglePlay, onStop, onSeek, onResize }: { audioSelection:AudioSelection|null;onAudioSelect:(s:AudioSelection)=>void;onAudioEdit:(fn:(p:Project)=>void)=>void;transitionId:string;onTransition:(id:string)=>void;project: Project; activeId: string; playFrame: number; playing: boolean; onTogglePlay: () => void; onStop: () => void; onSeek: (frame: number) => void; onResize: (id: string, frames: number) => boolean }) {
  const entries = allPanels(project), total = projectFrames(project), active = entries.find(p => p.panel.id === activeId) || entries[0];
  const [timelineZoom,setTimelineZoom]=useState(1);
  const scale = Math.min(48 * timelineZoom / project.fps, 200000 / Math.max(total,audioEnd(project)));
  const labels=useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ id: string; frames: number } | null>(null), drag = useRef<Resize | null>(null), body = useRef<HTMLDivElement>(null), scroll = useRef<HTMLDivElement>(null), seeking = useRef(false);
  const durations = entries.map(({ panel }) => preview?.id === panel.id ? preview.frames : panel.duration), displayTotal = Math.max(audioEnd(project),durations.reduce((a, b) => a + b, 0)), width = Math.max(1, displayTotal * scale);
  const startResize = (e: PointerEvent<HTMLButtonElement>, id: string, duration: number) => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); onSeek(panelStart(project, id)); drag.current = { id, startX: e.clientX, original: duration, scale, frames: duration }; setPreview({ id, frames: duration }); };
  const moveResize = (e: PointerEvent<HTMLButtonElement>) => { if (!drag.current) return; const d = drag.current; d.frames = Math.max(1, Math.min(360000, d.original + Math.round((e.clientX - d.startX) / d.scale))); setPreview({ id: d.id, frames: d.frames }); };
  const endResize = () => { const d = drag.current; drag.current = null; setPreview(null); if (d && d.frames !== d.original) onResize(d.id, d.frames); };
  const cancelResize = () => { drag.current = null; setPreview(null); };
  useEffect(() => { const cancel = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelResize(); }; window.addEventListener('keydown', cancel); return () => window.removeEventListener('keydown', cancel); }, []);
  useEffect(() => {
    const viewport = scroll.current;
    if (!viewport) return;
    // Seeking and Go to Start must reveal the playhead even when playback is paused.
    if (playFrame === 0) {
      if (viewport.scrollLeft !== 0) viewport.scrollLeft = 0;
      return;
    }
    const x = playFrame * scale;
    const left = viewport.scrollLeft;
    const right = left + viewport.clientWidth;
    const margin = Math.min(60, viewport.clientWidth / 4);
    if (x < left + margin || x > right - margin) {
      viewport.scrollLeft = Math.max(0, x - viewport.clientWidth / 3);
    }
  }, [playFrame, playing, scale]);
  const seekPointer = (e: PointerEvent<HTMLDivElement>) => { if (!body.current) return; const r = body.current.getBoundingClientRect(); onSeek(Math.max(0, Math.min(total - 1, Math.round((e.clientX - r.left) / scale)))); };
  const maxTicks = Math.ceil(displayTotal / project.fps); const tickStep = Math.max(1, Math.ceil(maxTicks / 200), Math.ceil(70 / (project.fps * scale)));
  const ticks = Array.from({ length: Math.floor(maxTicks / tickStep) + 1 }, (_, i) => i * tickStep * project.fps).filter(f => f <= displayTotal);
  let offset = 0;
  return <div className="timeline-view">

    <div className="timeline-preview"><PlaybackPreview project={project} frame={playFrame}/></div>
    <div className="timing-summary"><strong>{timecode(total, project.fps)}</strong><span>Drag a clip’s right edge to change its duration · {preview ? `${secondsText(preview.frames, project.fps)} seconds` : 'Timing stays connected across workspaces'}</span><div className="timeline-zoom"><button aria-label="Timeline zoom out" onClick={()=>setTimelineZoom(z=>Math.max(.125,z/2))}>−</button><button aria-label="Timeline zoom in" onClick={()=>setTimelineZoom(z=>Math.min(8,z*2))}>+</button><button aria-label="Fit timeline" onClick={()=>setTimelineZoom(Math.max(.125,Math.min(8,(scroll.current?.clientWidth||500)/displayTotal*project.fps/48)))}>Fit</button></div></div>
    <div className={`timeline-layout ${project.audioTracks.length?'with-audio':''}`} style={project.audioTracks.length?{flexBasis:Math.min(414,198+project.audioTracks.length*72)}:undefined}><div className="timeline-labels" ref={labels} onWheel={e=>{if(scroll.current)scroll.current.scrollTop+=e.deltaY;}}><div>TIME</div><div>PANELS</div><div>CAMERA</div>{project.audioTracks.length===0?<div>AUDIO</div>:project.audioTracks.map(t=><div className={`audio-track-label ${audioSelection?.trackId===t.id?'selected':''}`} key={t.id}><button className="audio-track-name" title={`Select audio track ${t.name}`} onClick={()=>onAudioSelect({trackId:t.id})}>{t.name}</button><div><button aria-label={`Mute ${t.name}`} aria-pressed={t.mute} className={t.mute?'active':''} onClick={()=>onAudioEdit(p=>{p.audioTracks.find(x=>x.id===t.id)!.mute=!t.mute;})}>M</button><button aria-label={`Solo ${t.name}`} aria-pressed={t.solo} className={t.solo?'active':''} onClick={()=>onAudioEdit(p=>{p.audioTracks.find(x=>x.id===t.id)!.solo=!t.solo;})}>S</button><input aria-label={`Volume ${t.name}`} type="range" min="0" max="200" value={t.gain*100} title={`${Math.round(t.gain*100)}%`} onChange={e=>onAudioEdit(p=>{p.audioTracks.find(x=>x.id===t.id)!.gain=Number(e.target.value)/100;})}/></div></div>)}</div><div className="timeline-scroll" ref={scroll} onScroll={e=>{if(labels.current)labels.current.scrollTop=e.currentTarget.scrollTop;}}><div className="timeline-timebody" ref={body} style={{ width }}>
      <div className="timeline-ruler" role="slider" tabIndex={0} aria-label="Timeline playhead" aria-valuemin={0} aria-valuemax={total - 1} aria-valuenow={playFrame} aria-valuetext={timecode(playFrame, project.fps)} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); onSeek(playFrame + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? project.fps : 1)); } if (e.key === 'Home') onSeek(0); if (e.key === 'End') onSeek(total - 1); }} onPointerDown={e => { if (e.button === 0) { e.currentTarget.setPointerCapture(e.pointerId); seeking.current = true; seekPointer(e); } }} onPointerMove={e => { if (seeking.current) seekPointer(e); }} onPointerUp={() => { seeking.current = false; }} onPointerCancel={() => { seeking.current = false; }}>
        {ticks.map(frame => <span key={frame} className="timeline-tick" style={{ left: frame * scale }}>{timecode(frame, project.fps)}</span>)}
      </div>
      <div className="timeline-clips proportional-clips">{entries.map(({ scene, panel }, i) => { const start = offset; offset += durations[i]; return <div className={`timeline-clip ${panel.id === activeId ? 'selected' : ''} ${preview?.id === panel.id ? 'resizing' : ''}`} key={panel.id} data-panel-id={panel.id} data-duration={durations[i]} style={{ width: durations[i] * scale }}><button className="timeline-clip-content" aria-label={`Timeline ${scene.name} / ${panel.name}`} onClick={() => onSeek(start)}><strong>{scene.name} / {panel.name}</strong><Thumbnail panel={panel} project={project}/><span>{secondsText(durations[i], project.fps)}s · {timecode(durations[i], project.fps)}</span></button>{project.transitions.filter(t=>t.toId===panel.id).map(t=><TransitionMarker key={t.id} transition={t} selected={transitionId===t.id} onSelect={()=>onTransition(t.id)}/>)}<button className="duration-resize-handle" aria-label={`Resize duration for ${scene.name} / ${panel.name}`} title="Drag to stretch or squash · Arrow keys adjust by one frame" onPointerDown={e => startResize(e, panel.id, panel.duration)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={cancelResize} onLostPointerCapture={() => { if (drag.current) cancelResize(); }} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); onResize(panel.id, Math.max(1, Math.min(360000, panel.duration + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1)))); } }}><span>⋮</span></button></div>; })}</div>
      <div className="camera-lane timeline-camera-lane" aria-label="Timeline camera keys">{project.scenes.map(s=><div key={s.id} className="camera-scene-track" style={{left:sceneStart(project,s)*scale,width:s.panels.reduce((n,p)=>n+p.duration,0)*scale}}>{s.camera.length === 0 ? <span>{s.name} · No camera keys</span> : s.camera.map((k,i)=><button key={k.id} style={{left:k.frame*scale,color:i===0?'#32c85b':i===s.camera.length-1?'#ef4d50':'#ff922c'}} title={`${s.name} camera · ${timecode(k.frame,project.fps)}`} aria-label={`${s.name} camera key at ${timecode(k.frame,project.fps)}`} onClick={()=>onSeek(sceneStart(project,s)+k.frame)}>◆</button>)}</div>)}</div><AudioLanes project={project} scale={scale} selection={audioSelection} onSelect={onAudioSelect} onEdit={onAudioEdit}/>
      <div className="timeline-playhead-line" style={{ left: Math.max(0, Math.min(displayTotal - 1, playFrame)) * scale }} aria-hidden="true"><span>▼</span></div>
    </div></div></div>
  </div>;
}
