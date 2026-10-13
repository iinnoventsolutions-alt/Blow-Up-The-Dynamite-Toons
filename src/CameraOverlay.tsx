import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { cameraAt, type Panel, type Project, type Scene } from './model';
import { cameraCorners, localPanelStart, type CameraPose } from './camera';
export default function CameraOverlay({ scene, panel, project, frame, editable = false, onChange }: { scene: Scene; panel: Panel; project: Project; frame?: number; editable?: boolean; onChange?: (frame: number, pose: CameraPose) => void }) {
  const start = localPanelStart(scene, panel), end = start + panel.duration - 1;
  const [live, setLive] = useState<{ frame: number; pose: CameraPose } | null>(null);
  const drag = useRef<{ frame: number; pose: CameraPose; x: number; y: number; mode: 'pan' | 'zoom'; radius: number } | null>(null);
  const inPose = live?.frame === start ? live.pose : cameraAt(scene, start, project), outPose = live?.frame === end ? live.pose : cameraAt(scene, end, project);
  const pos = (e: PointerEvent<SVGSVGElement>) => { const matrix=e.currentTarget.getScreenCTM();const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix?.inverse());return {x:p.x,y:p.y}; };
  const begin = (e: PointerEvent<SVGSVGElement>) => { if (!editable || e.button !== 0) return; const target = e.target as SVGElement, f = Number(target.dataset.frame); if (!Number.isFinite(f) || !target.hasAttribute('data-frame')) return; e.stopPropagation(); e.preventDefault(); e.currentTarget.focus(); const p = pos(e), pose = cameraAt(scene, f, project); drag.current = { frame: f, pose, ...p, mode: target.dataset.mode === 'zoom' ? 'zoom' : 'pan', radius: Math.hypot(p.x - pose.x, p.y - pose.y) }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e: PointerEvent<SVGSVGElement>) => { const d = drag.current; if (!d) return; const p = pos(e); const pose = d.mode === 'pan' ? { ...d.pose, x: Math.max(-8192, Math.min(16384, d.pose.x + p.x - d.x)), y: Math.max(-8192, Math.min(16384, d.pose.y + p.y - d.y)) } : { ...d.pose, zoom: Math.max(.01, Math.min(100, d.pose.zoom * d.radius / Math.max(1, Math.hypot(p.x - d.pose.x, p.y - d.pose.y)))) }; setLive({ frame: d.frame, pose }); };
  const cancel = () => { drag.current = null; setLive(null); };
  const finish = () => { if (drag.current && live) onChange?.(live.frame, live.pose); cancel(); };
  const a = cameraCorners(inPose, project), b = cameraCorners(outPose, project), handle = Math.max(project.width, project.height) / 100;
  const outline = (pose: CameraPose, corners: [number, number][], f: number, color: string, label: string) => <g><polygon data-frame={f} data-mode="pan" points={corners.map(p => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={handle / 5} className="camera-frame"/><text x={corners[0][0] + handle} y={corners[0][1] + handle * 1.7} fill={color} fontSize={handle * 1.25}>{label}</text>{corners.map(([x, y], i) => <rect key={i} data-frame={f} data-mode="zoom" x={x - handle / 2} y={y - handle / 2} width={handle} height={handle} fill={color} className="camera-handle"/>)}<circle data-frame={f} data-mode="pan" cx={pose.x} cy={pose.y} r={handle / 2} fill={color} className="camera-handle"/></g>;
  return <svg className={`camera-overlay ${editable ? 'editable' : ''}`} viewBox={`0 0 ${project.width} ${project.height}`} aria-label="Camera movement overlay" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={e => { if (e.key === 'Escape') cancel(); }} tabIndex={editable ? 0 : undefined}>
    <defs><marker id={`arrow-${panel.id}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="#8c90db"/></marker></defs>
    {a.map(([x,y],i) => <line key={i} x1={x} y1={y} x2={b[i][0]} y2={b[i][1]} stroke="#8c90db" strokeWidth={handle / 9} markerEnd={`url(#arrow-${panel.id})`}/>)}
    {outline(inPose, a, start, '#32c85b', 'IN')}{outline(outPose, b, end, '#ef4d50', 'OUT')}
    {frame !== undefined && <polygon className="camera-current" points={cameraCorners(cameraAt(scene, frame, project), project).map(p=>p.join(',')).join(' ')} fill="none" stroke="#ff922c" strokeWidth={handle / 8} strokeDasharray={`${handle} ${handle / 2}`}/>}
  </svg>;
}
