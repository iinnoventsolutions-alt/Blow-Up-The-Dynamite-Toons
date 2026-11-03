import { useEffect, useState } from 'react';
import { resolveCompatibleCamera, type CameraPose } from './sequential-camera';
import { cameraAt, sceneFrames, timecode, type CameraKey, type Project, type Scene, type Panel } from './model';
function NumberField({ label, value, min, max, step = 'any', onChange }: { label: string; value: number; min: number; max: number; step?: string; onChange: (n: number) => void }) {
  const display = String(Number(value.toFixed(4)));
  const [text, setText] = useState(display); useEffect(()=>setText(display),[display]);
  return <label className="field"><span>{label}</span><input aria-label={label} type="number" value={text} min={min} max={max} step={step} onChange={e=>setText(e.target.value)} onBlur={e=>{const entered=e.currentTarget.value;const n=Number(entered);if(entered !== display && entered.trim() && Number.isFinite(n) && n>=min && n<=max && (step !== '1' || Number.isInteger(n))) onChange(n);setText(display);}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label>;
}
export default function CameraInspector({ project, scene, panel, frame, editFrame = frame, selectedEndpoint = null, onSelectEndpoint, onSeek, onEdit, onKeyFrame, onDelete, onSetup, onClear, onExport, onCopy, onPaste, onCopyOut, onPasteStart, onReset, canPaste, canPasteStart, onAddBoundary, onSequentialOut, onSequentialAnimate }: { project: Project; scene: Scene; panel: Panel; frame: number; editFrame?:number; selectedEndpoint?:'in'|'out'|'intermediate'|null; onSelectEndpoint?:(endpoint:'in'|'out',frame:number)=>void; onSeek: (n: number)=>void; onEdit: (values: Partial<CameraKey>)=>void; onKeyFrame: (id: string, frame: number)=>void; onDelete: ()=>void; onSetup: ()=>void; onClear: ()=>void; onExport: (mode: 'camera' | 'overlay')=>void; onCopy:()=>void; onPaste:()=>void; onCopyOut:()=>void; onPasteStart:()=>void; onReset:()=>void; canPaste:boolean; canPasteStart:boolean; onAddBoundary:(edge:'start'|'end')=>void; onSequentialOut?:(pose:CameraPose)=>void; onSequentialAnimate?:()=>void }) {
  // RFU4-RA.4C.2A: sequential scenes have a distinct editing contract.
  // Do not expose legacy scene-key mutation controls until sequential writes are wired.
  if(scene.sequentialCamera){
    const start=scene.panels.slice(0,scene.panels.indexOf(panel)).reduce((n,p)=>n+p.duration,0);
    const resolved=resolveCompatibleCamera(project,scene.id,panel.id,frame-start);
    const animated=resolved.mode==='animated';
    return <section className="camera-inspector camera-sequential-inspector" aria-label="Sequential camera editing state">
      <h3>Sequential Camera · {scene.name}</h3>
      <p className="camera-help">Panel camera positions inherit the preceding panel's OUT. A new scene starts from its own baseline.</p>
      {!animated&&<button type="button" onClick={onSequentialAnimate} aria-label="Animate sequential camera IN/OUT">Animate IN/OUT</button>}
      <div role="group" aria-label="Sequential camera endpoints">
        <div aria-label="Inherited camera IN" data-camera-locked="true"><strong>IN · Locked</strong> — inherited from the preceding panel</div>
        <div aria-label="Sequential camera OUT"><strong>{animated?'OUT · Animated':'Camera · Static'}</strong> — {animated?'panel-owned endpoint':'no implicit keyframes'}</div>
      </div>
      <label className="field"><span>Scene camera time · {timecode(frame,project.fps)}</span><input aria-label="Scene camera time" type="range" min="0" max={sceneFrames(scene)-1} value={frame} onChange={e=>onSeek(Number(e.target.value))}/></label>
      <div className="camera-numbers"><div>IN: {resolved.inPose.x.toFixed(2)}, {resolved.inPose.y.toFixed(2)} · {resolved.inPose.zoom.toFixed(3)}×</div><div>OUT: {resolved.outPose.x.toFixed(2)}, {resolved.outPose.y.toFixed(2)} · {resolved.outPose.zoom.toFixed(3)}×</div></div>
      {animated && <div className="camera-numbers" aria-label="Sequential OUT numeric controls">
        <NumberField label="OUT X" value={resolved.outPose.x} min={-8192} max={16384} onChange={x=>onSequentialOut?.({...resolved.outPose,x})}/>
        <NumberField label="OUT Y" value={resolved.outPose.y} min={-8192} max={16384} onChange={y=>onSequentialOut?.({...resolved.outPose,y})}/>
        <NumberField label="OUT zoom" value={resolved.outPose.zoom} min={.01} max={100} onChange={zoom=>onSequentialOut?.({...resolved.outPose,zoom})}/>
        <NumberField label="OUT rotation" value={resolved.outPose.rotation} min={-36000} max={36000} onChange={rotation=>onSequentialOut?.({...resolved.outPose,rotation})}/>
      </div>}
      <p className="camera-help">Inherited IN is locked. Select Animate IN/OUT to activate green IN and editable red OUT; downstream panels inherit the OUT pose.</p>
    </section>;
  }
  const key=scene.camera.find(k=>k.frame===frame), segment=[...scene.camera].sort((a,b)=>a.frame-b.frame).filter(k=>k.frame<=editFrame).at(-1), pose=cameraAt(scene,editFrame,project), total=sceneFrames(scene), keys=[...scene.camera].sort((a,b)=>a.frame-b.frame);
  return <section className="camera-inspector"><h3>Camera · {scene.name}</h3><div role="group" aria-label="Camera editing target"><button type="button" aria-pressed={selectedEndpoint==='in'} onClick={()=>onSelectEndpoint?.('in',scene.panels.slice(0,scene.panels.indexOf(panel)).reduce((n,p)=>n+p.duration,0))}>Edit IN</button><button type="button" aria-pressed={selectedEndpoint==='out'} onClick={()=>onSelectEndpoint?.('out',scene.panels.slice(0,scene.panels.indexOf(panel)).reduce((n,p)=>n+p.duration,0)+panel.duration-1)}>Edit OUT</button><span aria-label="Active camera editing frame">Editing {selectedEndpoint?.toUpperCase()||'playhead'} · {timecode(editFrame,project.fps)}</span></div><p className="camera-help">Green IN / red OUT show this panel’s start and end. Camera keys belong to the scene.</p><label className="field"><span>Scene camera time · {timecode(frame,project.fps)}</span><input aria-label="Scene camera time" type="range" min="0" max={total-1} value={frame} onChange={e=>onSeek(Number(e.target.value))}/></label>
    <div className="camera-buttons" role="toolbar" aria-label="Panel camera actions">
<button title="Add keyframe at beginning of current panel" aria-label="Add keyframe at beginning of current panel" onClick={()=>{onSeek(scene.panels.slice(0,scene.panels.indexOf(panel)).reduce((n,p)=>n+p.duration,0));onAddBoundary('start');}}>┃◆</button>
<button title="Add keyframe at current frame" aria-label="Add keyframe at current frame" onClick={()=>onEdit({})}>+◆</button>
<button title="Add keyframe at end of current panel" aria-label="Add keyframe at end of current panel" onClick={()=>{onSeek(scene.panels.slice(0,scene.panels.indexOf(panel)).reduce((n,p)=>n+p.duration,0)+panel.duration-1);onAddBoundary('end');}}>◆┃</button>
<button title="Reset camera for selected panel" aria-label="Reset camera for selected panel" onClick={onReset}>↺</button>
<button title="Copy camera from selected panel" aria-label="Copy camera from selected panel" onClick={onCopy}>⧉</button>
<button title="Paste and fit camera on selected panel" aria-label="Paste and fit camera on selected panel" disabled={!canPaste} onClick={onPaste}>▣</button></div>
    <div className="camera-buttons" role="toolbar" aria-label="Camera endpoint transfer"><button aria-label="Copy camera OUT from selected panel" title="Copy only the ending camera pose" onClick={onCopyOut}>Copy OUT</button><button aria-label="Paste copied camera OUT as selected panel START" title="Paste as START without changing destination OUT" disabled={!canPasteStart} onClick={onPasteStart}>Paste as START</button></div>
    <div className="camera-key-list" aria-label="Camera keyframes">{keys.map((k,i)=><button key={k.id} className={k.frame===frame?'active':''} onClick={()=>onSeek(k.frame)} aria-label={`Camera key at ${timecode(k.frame,project.fps)}`}><span style={{color:i===0?'#32c85b':i===keys.length-1?'#ef4d50':'#ff922c'}}>◆</span> {timecode(k.frame,project.fps)}</button>)}</div>
    {key && <NumberField label="Key frame (scene)" value={key.frame} min={0} max={total-1} step="1" onChange={n=>onKeyFrame(key.id,n)}/>}
    <div className="camera-numbers"><NumberField label="Camera X" value={pose.x} min={-8192} max={16384} onChange={x=>onEdit({x})}/><NumberField label="Camera Y" value={pose.y} min={-8192} max={16384} onChange={y=>onEdit({y})}/><NumberField label="Camera zoom" value={pose.zoom} min={.01} max={100} onChange={zoom=>onEdit({zoom})}/><NumberField label="Camera rotation" value={pose.rotation} min={-36000} max={36000} onChange={rotation=>onEdit({rotation})}/></div>
    <label className="field"><span>Move to next key</span><select aria-label="Camera interpolation" value={scene.camera.find(k=>k.frame===editFrame)?.interpolation || segment?.interpolation || 'linear'} onChange={e=>onEdit({interpolation:e.target.value as CameraKey['interpolation']})}><option value="linear">Linear</option><option value="ease">Ease in / out</option><option value="hold">Hold</option></select></label>
    <div className="camera-buttons"><button disabled={!key} onClick={onDelete}>Delete key</button><button disabled={!keys.length} onClick={onClear}>Clear scene camera</button></div>
    <div className="camera-buttons"><button onClick={()=>onEdit({x:project.width/2,y:project.height/2,zoom:1,rotation:0})}>Reset current pose</button><button onClick={()=>onExport('camera')}>Export camera PNG</button><button onClick={()=>onExport('overlay')}>Export overlay PNG</button></div>
    <small>Key frame (scene) and Delete key manage the playhead key. Camera X/Y/zoom/rotation edit the selected target. Drag frame centers to pan; drag corner squares to zoom with the Camera tool. Rotation is set above. Changes create a key at the selected editing frame.</small>
  </section>;
}
