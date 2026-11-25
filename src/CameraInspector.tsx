import { useEffect, useState } from 'react';
import { resolveCompatibleCamera, type CameraPose } from './sequential-camera';
import { cameraAt, sceneFrames, timecode, type CameraKey, type Project, type Scene, type Panel } from './model';
import type { CameraResetScope } from './camera-workflow';

function NumberField({label,value,min,max,step='any',onChange}:{label:string;value:number;min:number;max:number;step?:string;onChange:(n:number)=>void}) {
  const display=String(Number(value.toFixed(4)));
  const [text,setText]=useState(display);
  useEffect(()=>setText(display),[display]);
  return <label className="field"><span>{label}</span><input aria-label={label} type="number" value={text} min={min} max={max} step={step}
    onChange={e=>setText(e.target.value)}
    onBlur={e=>{const raw=e.currentTarget.value,n=Number(raw);if(raw!==display&&raw.trim()&&Number.isFinite(n)&&n>=min&&n<=max&&(step!=='1'||Number.isInteger(n)))onChange(n);setText(display);}}
    onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label>;
}
function PoseFields({pose,label,onChange}:{pose:CameraPose;label:string;onChange:(pose:CameraPose)=>void}) {
  return <div className="camera-numbers" aria-label={label+' numeric controls'} style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>
    <NumberField label={label+' X'} value={pose.x} min={-8192} max={16384} onChange={x=>onChange({...pose,x})}/>
    <NumberField label={label+' Y'} value={pose.y} min={-8192} max={16384} onChange={y=>onChange({...pose,y})}/>
    <NumberField label={label+' zoom'} value={pose.zoom} min={.01} max={100} onChange={zoom=>onChange({...pose,zoom})}/>
    <NumberField label={label+' rotation'} value={pose.rotation} min={-36000} max={36000} onChange={rotation=>onChange({...pose,rotation})}/>
  </div>;
}
function ResetActions({onResetScope,canResetKey}:{onResetScope:(scope:CameraResetScope)=>void;canResetKey:boolean}) {
  return <details className="camera-reset-menu" style={{position:'relative'}}>
    <summary aria-label="Reset camera options">Reset Camera ▾</summary>
    <div role="group" aria-label="Camera reset scopes" style={{display:'grid',gap:4,padding:'6px 0'}}>
      <button type="button" disabled={!canResetKey} onClick={()=>onResetScope('key')}>Reset selected key</button>
      <button type="button" onClick={()=>onResetScope('panel')}>Reset current panel</button>
      <button type="button" onClick={()=>onResetScope('scene')}>Reset entire scene</button>
    </div>
  </details>;
}

type Props = {
 project:Project;scene:Scene;panel:Panel;frame:number;editFrame?:number;
 selectedEndpoint?:'in'|'out'|'intermediate'|null;onSelectEndpoint?:(endpoint:'in'|'out'|'intermediate',frame:number)=>void;
 onSeek:(n:number)=>void;onEdit:(values:Partial<CameraKey>)=>void;onKeyFrame:(id:string,frame:number)=>void;
 onDelete:()=>void;onSetup:()=>void;onClear:()=>void;onExport:(mode:'camera'|'overlay')=>void;
 onCopy:()=>void;onPaste:()=>void;onCopyOut:()=>void;onPasteStart:()=>void;
 onResetScope:(scope:CameraResetScope)=>void;onDeleteSelected:()=>void;canPaste:boolean;canPasteStart:boolean;
 onAddBoundary:(edge:'start'|'end')=>void;
 onSequentialOut?:(pose:CameraPose)=>void;onSequentialIn?:(pose:CameraPose)=>void;
 onSequentialAnimate?:()=>void;onSequentialIntermediateAdd?:(frame:number)=>void;
 onSequentialIntermediateDelete?:(frame:number)=>void;onSequentialIntermediateEdit?:(frame:number,pose:CameraPose)=>void;
 onSequentialStatic?:(pose:CameraPose)=>void;
};
export default function CameraInspector(props:Props) {
 const {project,scene,panel,frame,editFrame=frame,selectedEndpoint=null,onSelectEndpoint,onSeek,onEdit,onKeyFrame,onDelete,onClear,onExport,onCopy,onPaste,onCopyOut,onPasteStart,onResetScope,onDeleteSelected,canPaste,canPasteStart,onAddBoundary,onSequentialOut,onSequentialIn,onSequentialAnimate,onSequentialIntermediateAdd,onSequentialIntermediateEdit,onSequentialStatic}=props;
 const start=scene.panels.slice(0,scene.panels.indexOf(panel)).reduce((n,p)=>n+p.duration,0);
 const end=start+panel.duration-1;
 const isSequential=!!scene.sequentialCamera;
 const currentKey=scene.camera.find(k=>k.frame===editFrame);
 const legacyKeys=[...scene.camera].sort((a,b)=>a.frame-b.frame);
 const currentLocal=Math.max(0,Math.min(panel.duration-1,Math.floor(frame-start)));
 const state=scene.sequentialCamera?.panels[panel.id];
 const keys=state?.mode==='animated'?[...state.keys].sort((a,b)=>a.frame-b.frame):[];
 const intermediateKeys=keys.filter(k=>k.frame>0&&k.frame<panel.duration-1);
 const firstPanel=scene.panels[0]?.id===panel.id;
 const selectedLocal=Math.floor(editFrame-start);
 const chosenIntermediate=selectedEndpoint==='intermediate'?intermediateKeys.find(k=>k.frame===selectedLocal):undefined;
 const hasOut=keys.some(k=>k.frame===panel.duration-1);
 const resolved=isSequential?resolveCompatibleCamera(project,scene.id,panel.id,currentLocal):null;
 let pose:CameraPose|null=null;
 let label='Camera';
 let onPose:(pose:CameraPose)=>void=()=>{};
 if(isSequential&&resolved){
  if(selectedEndpoint==='intermediate'&&chosenIntermediate){
   pose=resolveCompatibleCamera(project,scene.id,panel.id,chosenIntermediate.frame).pose;label='Intermediate';
   onPose=p=>onSequentialIntermediateEdit?.(chosenIntermediate.frame,p);
  }else if(selectedEndpoint==='in'&&firstPanel) {
   pose=resolved.inPose;label='IN';onPose=p=>onSequentialIn?.(p);
  }else if(selectedEndpoint==='out'&&state?.mode==='animated'){
   pose=resolved.outPose;label='OUT';onPose=p=>onSequentialOut?.(p);
  }else if(state?.mode==='static'||state?.mode==='break'){
   pose=resolved.pose;label='Camera';onPose=p=>onSequentialStatic?.(p);
  }
 }
 const canResetKey=isSequential
   ? (selectedEndpoint==='in'&&firstPanel)||(selectedEndpoint==='out'&&state?.mode==='animated')||!!chosenIntermediate||state?.mode==='static'||state?.mode==='break'
   : !!currentKey;
 const canDeleteKey=isSequential ? !!chosenIntermediate||(selectedEndpoint==='out'&&hasOut) : !!currentKey;

 return <section className="camera-inspector camera-compact" aria-label={isSequential?'Sequential camera editing state':'Camera editing state'}>
  <header><h3>Camera · {scene.name}</h3><p className="camera-help">{isSequential?'Panel-owned keys; subsequent IN inherits the preceding OUT.':'Legacy scene-owned keys are preserved without conversion.'}</p></header>
  <div className="camera-buttons" role="toolbar" aria-label="Camera transfer and reset">
   <button type="button" aria-label="Copy camera from selected panel" onClick={onCopy}>Copy</button>
   <button type="button" aria-label="Paste camera on selected panel" disabled={!canPaste} onClick={onPaste}>Paste</button>
   <button type="button" aria-label="Reset camera for selected panel" onClick={()=>onResetScope('panel')}>Reset Panel</button><ResetActions onResetScope={onResetScope} canResetKey={canResetKey}/>
  </div>
  <div className="camera-key-section" aria-label="Panel camera keyframes">
   <h4>Panel keyframes</h4>
   <label className="field"><span>Scene camera time · {timecode(frame,project.fps)}</span><input aria-label="Scene camera time" type="range" min={0} max={Math.max(0,sceneFrames(scene)-1)} value={frame} onChange={e=>onSeek(Number(e.target.value))}/></label>
   {isSequential ? <>
     {state?.mode==='animated' ? <>
       <div className="camera-key-list">
        <button type="button" aria-label={firstPanel?'Select editable IN':'Select locked IN'} aria-pressed={selectedEndpoint==='in'} onClick={()=>{onSeek(start);if(firstPanel)onSelectEndpoint?.('in',start);}}><span style={{color:'#32c85b'}}>◆</span> IN · frame 0 {firstPanel?'(editable)':'(locked)'}</button>
        {intermediateKeys.map(k=><button key={k.frame} type="button" aria-label={'Select intermediate keyframe '+k.frame} aria-pressed={selectedEndpoint==='intermediate'&&selectedLocal===k.frame} onClick={()=>{onSeek(start+k.frame);onSelectEndpoint?.('intermediate',start+k.frame);}}><span style={{color:'#3889e8'}}>◆</span> Intermediate · frame {k.frame}</button>)}
        <button type="button" aria-label="Select camera OUT" aria-pressed={selectedEndpoint==='out'} onClick={()=>{onSeek(end);onSelectEndpoint?.('out',end);}}><span style={{color:'#ef4d50'}}>◆</span> OUT · frame {panel.duration-1} {!hasOut?'(inferred)':''}</button>
       </div>
       <div className="camera-buttons">
        <button type="button" disabled={currentLocal<=0||currentLocal>=panel.duration-1||intermediateKeys.some(k=>k.frame===currentLocal)} onClick={()=>onSequentialIntermediateAdd?.(currentLocal)}>+ Add intermediate key</button>
        <button type="button" disabled={!canDeleteKey} onClick={onDeleteSelected}>Delete selected key</button>
       </div>
     </> : <>
       <p className="camera-help">Camera · Static / Inherited. No authored animation keys in this panel.</p>
       {panel.duration>=2&&<button type="button" onClick={onSequentialAnimate}>Animate IN/OUT</button>}
     </>}
   </> : <>
     <div role="group" aria-label="Camera editing target" className="camera-buttons">
       <button type="button" aria-pressed={selectedEndpoint==='in'} onClick={()=>onSelectEndpoint?.('in',start)}>Edit IN</button>
       <button type="button" aria-pressed={selectedEndpoint==='out'} onClick={()=>onSelectEndpoint?.('out',end)}>Edit OUT</button>
       <span aria-label="Active camera editing frame">Editing {selectedEndpoint?.toUpperCase()||'playhead'} · {timecode(editFrame,project.fps)}</span>
     </div>
     <div className="camera-buttons" role="toolbar" aria-label="Add panel camera keys">
       <button type="button" aria-label="Add keyframe at beginning of current panel" onClick={()=>{onSeek(start);onAddBoundary('start');}}>+ IN key</button>
       <button type="button" aria-label="Add keyframe at current frame" onClick={()=>onEdit({})}>+ Current key</button>
       <button type="button" aria-label="Add keyframe at end of current panel" onClick={()=>{onSeek(end);onAddBoundary('end');}}>+ OUT key</button>
     </div>
     <div className="camera-key-list" aria-label="Camera keyframes">{legacyKeys.map((k,i)=><button key={k.id} type="button" className={k.frame===editFrame?'active':''} onClick={()=>onSeek(k.frame)} aria-label={'Camera key at '+timecode(k.frame,project.fps)}><span style={{color:i===0?'#32c85b':i===legacyKeys.length-1?'#ef4d50':'#3889e8'}}>◆</span> {timecode(k.frame,project.fps)}</button>)}</div>
     <div className="camera-buttons"><button type="button" disabled={!canDeleteKey} onClick={onDeleteSelected}>Delete key</button><button type="button" disabled={!legacyKeys.length} onClick={onClear}>Clear scene camera</button></div>
   </>}
  </div>
  <div className="camera-transform-section" aria-label="Selected camera transform">
   <h4>Selected key transform</h4>
   {isSequential ? (pose?<PoseFields label={label} pose={pose} onChange={onPose}/>:<p className="camera-help">Select an editable IN, OUT, or intermediate key to edit its position, zoom and rotation.</p>) : <>
    {currentKey&&<NumberField label="Key frame (scene)" value={currentKey.frame} min={0} max={Math.max(0,sceneFrames(scene)-1)} step="1" onChange={n=>onKeyFrame(currentKey.id,n)}/>}
    <PoseFields label="Camera" pose={cameraAt(scene,editFrame,project)} onChange={p=>onEdit(p)}/>
    <label className="field"><span>Move to next key</span><select aria-label="Camera interpolation" value={scene.camera.find(k=>k.frame===editFrame)?.interpolation||legacyKeys.filter(k=>k.frame<=editFrame).at(-1)?.interpolation||'linear'} onChange={e=>onEdit({interpolation:e.target.value as CameraKey['interpolation']})}><option value="linear">Linear</option><option value="ease">Ease in / out</option><option value="hold">Hold</option></select></label>
   </>}
  </div>
  <details className="camera-advanced" open={!isSequential}>
   <summary>Additional camera tools</summary>
   {!isSequential&&<>
    <div className="camera-buttons"><button type="button" aria-label="Copy camera OUT from selected panel" onClick={onCopyOut}>Copy OUT</button><button type="button" aria-label="Paste copied camera OUT as selected panel START" disabled={!canPasteStart} onClick={onPasteStart}>Paste as START</button></div>
    <div className="camera-buttons"><button type="button" disabled={!legacyKeys.length} onClick={onClear}>Clear scene camera</button><button type="button" onClick={()=>onEdit({x:project.width/2,y:project.height/2,zoom:1,rotation:0})}>Reset current pose</button></div>
   </>}
   <div className="camera-buttons"><button type="button" onClick={()=>onExport('camera')}>Export camera PNG</button><button type="button" onClick={()=>onExport('overlay')}>Export overlay PNG</button></div>
  </details>
  <p className="camera-help">{isSequential?(firstPanel?'First-panel IN remains editable; other panels inherit their IN from the previous OUT.':'Inherited IN is locked to the previous panel OUT.'):'Camera keys belong to the scene. Existing scene camera data is preserved.'} All camera edits support Undo/Redo.</p>
 </section>;
}
