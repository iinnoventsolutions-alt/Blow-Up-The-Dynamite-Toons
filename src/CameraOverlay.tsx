import {cameraRotationHandle,pointerAngle,rotateCamera} from './camera-rotation';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { cameraAt, type Panel, type Project, type Scene } from './model';
import { cameraCorners, localPanelStart, type CameraPose } from './camera';
export default function CameraOverlay({ scene, panel, project, frame, drawingMargin = 0, editable = false, selectedEndpoint = 'in', onSelectEndpoint, onChange }: { scene: Scene; panel: Panel; project: Project; frame?: number; drawingMargin?: number; editable?: boolean; selectedEndpoint?: 'in'|'out'; onSelectEndpoint?: (endpoint:'in'|'out'|'intermediate',frame:number)=>void; onChange?: (frame: number, pose: CameraPose) => void }) {
  const start = localPanelStart(scene, panel), end = start + panel.duration - 1;
  const panelAnimated = scene.camera.some(key => key.frame >= start && key.frame <= end);
  const showBothEndpoints = editable && panelAnimated;
  const [live, setLive] = useState<{ frame: number; pose: CameraPose } | null>(null);
  const liveRef = useRef<{ frame: number; pose: CameraPose } | null>(null);
  const pendingCommit = useRef<{ frame: number; pose: CameraPose } | null>(null);
  useEffect(() => {
    const pending = pendingCommit.current;
    if (!pending) return;
    const persisted = !scene.camera.some(key => key.frame >= start && key.frame <= end) ? panel.staticCamera : scene.camera.find(key => key.frame === pending.frame);
    if (persisted && (['x','y','zoom','rotation'] as const).every(key => Math.abs(persisted[key]-pending.pose[key]) < 1e-7)) {
      pendingCommit.current = null;
      liveRef.current = null;
      setLive(null);
    }
  }, [scene.camera, panel.staticCamera, start, end]);
  const drag = useRef<{ frame: number; pose: CameraPose; x: number; y: number; mode: 'pan' | 'zoom' | 'rotate'; angle: number; radius: number; pointerId: number } | null>(null);
  const staticMode = !panelAnimated && (scene.camera.length === 0 || !!panel.staticCamera);
  const staticPose = live?.pose ?? panel.staticCamera ?? cameraAt(scene,start,project);
  const inPose = staticMode ? staticPose : live?.frame === start ? live.pose : cameraAt(scene, start, project), outPose = staticMode ? staticPose : live?.frame === end ? live.pose : cameraAt(scene, end, project);
  const pos = (e: PointerEvent<SVGSVGElement>) => { const matrix=e.currentTarget.getScreenCTM();if (!matrix) return null;const determinant=matrix.a*matrix.d-matrix.b*matrix.c;if (!Number.isFinite(determinant)||Math.abs(determinant)<1e-12) return null;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());return Number.isFinite(p.x)&&Number.isFinite(p.y)?{x:p.x,y:p.y}:null; };
  const begin = (e: PointerEvent<SVGSVGElement>) => { if (!editable || e.button !== 0) return; const target = e.target as SVGElement; const endpoint = target.closest('[data-camera-endpoint]')?.getAttribute('data-camera-endpoint'); const f = endpoint === 'in' ? start : endpoint === 'out' ? end : Number(target.dataset.frame); if (!target.hasAttribute('data-frame') || !Number.isFinite(f)) return; e.stopPropagation(); e.preventDefault(); e.currentTarget.focus(); if (endpoint === 'in' || endpoint === 'out') onSelectEndpoint?.(endpoint,f); else onSelectEndpoint?.('intermediate',f); const p = pos(e); if (!p) return; const pose = staticMode ? (panel.staticCamera ?? cameraAt(scene,f,project)) : cameraAt(scene, f, project); drag.current = { frame: f, pose, ...p, pointerId:e.pointerId, mode: target.dataset.mode === 'rotate' ? 'rotate' : target.dataset.mode === 'zoom' ? 'zoom' : 'pan', angle:pointerAngle(p.x,p.y,pose), radius: Math.hypot(p.x - pose.x, p.y - pose.y) }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent<SVGSVGElement>) => { const d = drag.current; if (!d || d.pointerId !== e.pointerId) return; const p = pos(e); if (!p) return; const pose = d.mode === 'rotate' ? rotateCamera(d.pose,d.angle,pointerAngle(p.x,p.y,d.pose),e.shiftKey) : d.mode === 'pan' ? { ...d.pose, x: Math.max(-8192, Math.min(16384, d.pose.x + p.x - d.x)), y: Math.max(-8192, Math.min(16384, d.pose.y + p.y - d.y)) } : { ...d.pose, zoom: Math.max(.01, Math.min(100, d.pose.zoom * d.radius / Math.max(1, Math.hypot(p.x - d.pose.x, p.y - d.pose.y)))) }; liveRef.current = { frame: d.frame, pose }; setLive(liveRef.current); };
  const cancel = (e?: PointerEvent<SVGSVGElement>) => { const active = drag.current; if (!active || (e && active.pointerId !== e.pointerId)) return; drag.current = null; pendingCommit.current = null; liveRef.current = null; setLive(null); };
  // macOS can drop pointer capture before dispatching pointerup.
  // Preserve an already moved pose on unexpected capture loss; never invent a
  // camera edit when capture was lost without any valid movement.
  const recoverCaptureLoss = (e: PointerEvent<SVGSVGElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== e.pointerId) return;
    const last = liveRef.current;
    const changed = last?.frame === active.frame && (['x','y','zoom','rotation'] as const).some(k => Math.abs(last.pose[k] - active.pose[k]) > 1e-7);
    if (!changed || !last) { cancel(e); return; }
    drag.current = null;
    pendingCommit.current = last;
    onChange?.(last.frame, last.pose);
  };
  const finish = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    move(e);
    drag.current = null;
    if (!liveRef.current) return;
    const committed = liveRef.current;
    pendingCommit.current = committed;
    // Keep the released pose visible until the parent publishes the committed keyframe.
    onChange?.(committed.frame, committed.pose);
  };
  const a = cameraCorners(inPose, project), b = cameraCorners(outPose, project), handle = Math.max(project.width, project.height) / 100;
  const stationary = (['x','y','zoom','rotation'] as const).every(k=>Math.abs(inPose[k]-outPose[k])<1e-7);
  const intermediate = scene.camera.filter(k=>k.frame>start&&k.frame<end);
  const outline = (pose: CameraPose, corners: [number, number][], f: number, color: string, label: string) => <g><polygon data-frame={f} data-mode="pan" points={corners.map(p => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={handle / 5} className="camera-frame"/><text x={corners[0][0] + handle} y={corners[0][1] + handle * 1.7} fill={color} fontSize={handle * 1.25}>{label}</text>{corners.map(([x, y], i) => <rect key={i} data-frame={f} data-mode="zoom" x={x - handle / 2} y={y - handle / 2} width={handle} height={handle} fill={color} className="camera-handle"/>)}<circle data-frame={f} data-mode="pan" cx={pose.x} cy={pose.y} r={handle / 2} fill={color} className="camera-handle"/>{editable&&<g className="camera-rotation-control" aria-label="Rotate camera handle">{(()=>{const h=cameraRotationHandle(pose,corners,handle*2.5);return <><line x1={h.anchorX} y1={h.anchorY} x2={h.x} y2={h.y} stroke="#15c7e8" strokeWidth={handle/7} pointerEvents="none"/><circle data-frame={f} data-mode="rotate" aria-label="Rotate camera" cx={h.x} cy={h.y} r={handle*.75} fill="#15c7e8" stroke="#ffffff" strokeWidth={handle/8} className="camera-rotation-handle"/></>;})()}</g>}</g>;
  return <svg className={`camera-overlay ${editable ? 'editable' : ''}`} preserveAspectRatio="none" viewBox={`${-project.width*drawingMargin} ${-project.height*drawingMargin} ${project.width*(1+2*drawingMargin)} ${project.height*(1+2*drawingMargin)}`} aria-label="Camera movement overlay" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={recoverCaptureLoss} onKeyDown={e => { if (e.key === 'Escape') { const id=drag.current?.pointerId; cancel(); if (id !== undefined && e.currentTarget.hasPointerCapture(id)) e.currentTarget.releasePointerCapture(id); } }} tabIndex={editable ? 0 : undefined}>
    <defs><marker id={`arrow-${panel.id}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="#8c90db"/></marker></defs>
    {!staticMode && !stationary && a.map(([x,y],i) => <line key={i} x1={x} y1={y} x2={b[i][0]} y2={b[i][1]} stroke="#8c90db" strokeWidth={handle / 9} markerEnd={`url(#arrow-${panel.id})`}/>)}
    {!staticMode && stationary && <text x={a[0][0]} y={a[0][1]-handle*2} fontSize={handle*1.3} fill="#ffffff">Camera IN and OUT overlap — choose an endpoint below</text>}
    {staticMode ? outline(staticPose,cameraCorners(staticPose,project),start,'#222222','CAMERA') : showBothEndpoints ? <>
      <g data-camera-endpoint="in" opacity={selectedEndpoint==='in'?1:0.65} pointerEvents={selectedEndpoint !== 'in' ? 'none' : undefined} onPointerDown={()=>onSelectEndpoint?.('in',start)}>{outline(inPose, a, start, '#32c85b', 'IN')}</g>
      <g data-camera-endpoint="out" opacity={selectedEndpoint==='out'?1:0.65} pointerEvents={selectedEndpoint !== 'out' ? 'none' : undefined} onPointerDown={()=>onSelectEndpoint?.('out',end)}>{outline(outPose, b, end, '#ef4d50', 'OUT')}</g>
    </> : stationary ? outline(outPose,b,end,'#222222','CAMERA') : <>{outline(inPose,a,start,'#32c85b','IN')}{outline(outPose,b,end,'#ef4d50','OUT')}</>}
    {editable && !staticMode && <g className="camera-endpoint-selector">
      <rect x={-project.width*drawingMargin+handle} y={-project.height*drawingMargin+handle} width={handle*10} height={handle*3} rx={handle/2} fill={selectedEndpoint==='in'?'#214c30':'#18242b'} stroke="#32c85b" role="button" aria-label="Select camera IN endpoint" data-camera-select="in" onPointerDown={e=>{e.stopPropagation();e.preventDefault();onSelectEndpoint?.('in',start);}} />
      <text x={-project.width*drawingMargin+handle*2} y={-project.height*drawingMargin+handle*3} fontSize={handle*1.7} fill="#32c85b" pointerEvents="none">● IN</text>
      <rect x={-project.width*drawingMargin+handle*12} y={-project.height*drawingMargin+handle} width={handle*10} height={handle*3} rx={handle/2} fill={selectedEndpoint==='out'?'#53272b':'#18242b'} stroke="#ef4d50" role="button" aria-label="Select camera OUT endpoint" data-camera-select="out" onPointerDown={e=>{e.stopPropagation();e.preventDefault();onSelectEndpoint?.('out',end);}} />
      <text x={-project.width*drawingMargin+handle*13} y={-project.height*drawingMargin+handle*3} fontSize={handle*1.7} fill="#ef4d50" pointerEvents="none">● OUT</text>
    </g>}
    {intermediate.map(k=>{const pose=live?.frame===k.frame?live.pose:cameraAt(scene,k.frame,project);return <g key={k.id} className="camera-intermediate"><polygon data-frame={k.frame} data-mode="pan" points={cameraCorners(pose,project).map(p=>p.join(',')).join(' ')} fill="none" stroke="#3478df" strokeWidth={handle/7} strokeDasharray={`${handle*.8} ${handle*.5}`}/>{cameraCorners(pose,project).map(([x,y],i)=><rect key={i} data-frame={k.frame} data-mode="zoom" x={x-handle/2} y={y-handle/2} width={handle} height={handle} fill="#3478df" className="camera-handle"/>)}<circle data-frame={k.frame} data-mode="pan" cx={pose.x} cy={pose.y} r={handle/2} fill="#3478df" className="camera-handle"/>{editable&&(()=>{const h=cameraRotationHandle(pose,cameraCorners(pose,project),handle*2.5);return <g className="camera-rotation-control"><line x1={h.anchorX} y1={h.anchorY} x2={h.x} y2={h.y} stroke="#15c7e8" pointerEvents="none"/><circle data-frame={k.frame} data-mode="rotate" aria-label="Rotate intermediate camera" cx={h.x} cy={h.y} r={handle*.75} fill="#15c7e8" stroke="#fff" strokeWidth={handle/8}/></g>;})()}</g>;})}
    {!staticMode && frame !== undefined && <polygon className="camera-current" points={cameraCorners(live?.frame===frame?live.pose:cameraAt(scene, frame, project), project).map(p=>p.join(',')).join(' ')} fill="none" stroke="#ff922c" strokeWidth={handle / 8} strokeDasharray={`${handle} ${handle / 2}`}/>}
  </svg>;
}
