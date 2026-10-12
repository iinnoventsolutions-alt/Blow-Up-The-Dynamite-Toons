import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { uid, type Panel, type Project, type Stroke, type Point } from './model';
import { canDraw, drawPanel, preloadImages } from './render';
export type Tool = 'brush' | 'eraser' | 'hand';
export function Thumbnail({ panel, project }: { panel: Panel; project: Project }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { let active = true; preloadImages(panel).then(() => { if (active && ref.current) drawPanel(ref.current, panel, project, { width: 320 }); }).catch(() => {}); return () => { active = false; }; }, [panel, project.width, project.height]);
  return <canvas ref={ref} aria-label={`${panel.name} drawing preview`} />;
}
export function DrawingCanvas({ panel, project, layerId, tool, color, size, zoom, guides, onStroke, onError }: { panel: Panel; project: Project; layerId: string; tool: Tool; color: string; size: number; zoom: number; guides: boolean; onStroke: (stroke: Stroke) => void; onError: (message: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), live = useRef<Stroke | null>(null), paintFrame = useRef(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStart = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const layer = panel.layers.find(l => l.id === layerId);
  const draw = () => { if (canvas.current) drawPanel(canvas.current, panel, project, { live: live.current ? { layerId, stroke: live.current } : undefined }); };
  useEffect(() => { let active = true; live.current = null; panStart.current = null; preloadImages(panel).then(() => { if (active) draw(); }).catch(e => onError(e.message)); return () => { active = false; cancelAnimationFrame(paintFrame.current); }; }, [panel, project.width, project.height, layerId]);
  useEffect(() => { setPan({ x: 0, y: 0 }); }, [panel.id]);
  const point = (e: PointerEvent<HTMLCanvasElement>): Point => { const rect = e.currentTarget.getBoundingClientRect(); return [(e.clientX - rect.left) / rect.width * project.width, (e.clientY - rect.top) / rect.height * project.height, e.pointerType === 'pen' ? e.pressure || 0.1 : 1]; };
  const start = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === 'hand') { panStart.current = { x: e.clientX, y: e.clientY, originX: pan.x, originY: pan.y }; return; }
    if (!canDraw(layer)) { onError('Select a visible, unlocked layer to draw.'); return; }
    live.current = { id: uid(), tool, color, size, points: [point(e)] }; draw();
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (panStart.current) { setPan({ x: panStart.current.originX + e.clientX - panStart.current.x, y: panStart.current.originY + e.clientY - panStart.current.y }); return; }
    if (!live.current) return;
    const p = point(e), previous = live.current.points.at(-1)!;
    if (Math.hypot(p[0] - previous[0], p[1] - previous[1]) < 0.5 || live.current.points.length >= 100000) return;
    live.current.points.push(p); cancelAnimationFrame(paintFrame.current); paintFrame.current = requestAnimationFrame(draw);
  };
  const finish = () => { panStart.current = null; const stroke = live.current; live.current = null; cancelAnimationFrame(paintFrame.current); if (stroke) onStroke(stroke); };
  const cancel = () => { live.current = null; panStart.current = null; cancelAnimationFrame(paintFrame.current); draw(); };
  return <div className="stage-area"><div className="stage-paper" style={{ aspectRatio: `${project.width}/${project.height}`, '--aspect': project.width / project.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` } as CSSProperties}>
    <canvas ref={canvas} className={`drawing-surface tool-${tool}`} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={() => { if (live.current) cancel(); }} aria-label="Drawing canvas" />
    {guides && <div className="safe-guide" aria-hidden="true"><span>Action safe · 10%</span></div>}
  </div><span className="stage-hint">{tool === 'hand' ? 'Drag to pan · Fit resets zoom' : !canDraw(layer) ? 'Layer is hidden or locked' : `${tool === 'brush' ? 'Brush' : 'Eraser'} · ${size}px · ${layer?.name}`} </span></div>;
}
