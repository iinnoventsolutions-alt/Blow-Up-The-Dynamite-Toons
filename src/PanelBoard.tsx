import TransitionMarker from './TransitionMarker';
import { useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import type { Panel, Project, Scene } from './model';
import { allPanels, sceneFrames, timecode } from './model';
import { Thumbnail } from './Canvas';
type DragPayload = { kind: 'panels'; ids: string[] } | { kind: 'scene'; id: string };
type Cue = { kind: 'panels'; sceneId: string; beforeId: string | null } | { kind: 'scene'; beforeId: string | null };
type Props = { transitionId:string; onTransition:(id:string)=>void; project: Project; view: 'drawing' | 'panel'; activeId: string; selectedIds: string[]; onSelect: (id: string) => void; onSelection: (ids: string[]) => void; renderLayers: (panel: Panel) => ReactNode; onMove: (ids: string[], sceneId: string, beforeId: string | null) => void; onMoveScene: (id: string, beforeId: string | null) => void };
export default function PanelBoard({ transitionId,onTransition,project, view, activeId, selectedIds, onSelect, onSelection, renderLayers, onMove, onMoveScene }: Props) {
  const [dragging, setDragging] = useState<DragPayload | null>(null), dragRef = useRef<DragPayload | null>(null), [cue, setCue] = useState<Cue | null>(null);
  const grid = view === 'panel';
  const begin = (e: DragEvent, payload: DragPayload) => { dragRef.current = payload; setDragging(payload); setCue(null); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('application/x-issb-move', JSON.stringify(payload)); e.dataTransfer.setData('text/plain', payload.kind === 'scene' ? payload.id : payload.ids.join(',')); };
  const end = () => { setDragging(null); dragRef.current = null; setCue(null); };
  const panelCue = (e: DragEvent, s: Scene, beforeId: string | null) => {
    if (dragRef.current?.kind !== 'panels') return;
    e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move';
    const start = beforeId ? s.panels.findIndex(p => p.id === beforeId) : s.panels.length;
    const next = s.panels.slice(start).find(p => !dragRef.current || dragRef.current.kind !== 'panels' || !dragRef.current.ids.includes(p.id));
    setCue({ kind: 'panels', sceneId: s.id, beforeId: next?.id || null });
    const scroll = e.currentTarget.closest('.filmstrip-scroll, .panel-overview') as HTMLElement | null;
    if (scroll) { const r = scroll.getBoundingClientRect(); if (grid) { if (e.clientY < r.top + 45) scroll.scrollTop -= 15; if (e.clientY > r.bottom - 45) scroll.scrollTop += 15; } else { if (e.clientX < r.left + 65) scroll.scrollLeft -= 22; if (e.clientX > r.right - 65) scroll.scrollLeft += 22; } }
  };
  const sceneCue = (e: DragEvent, beforeId: string | null) => { if (dragRef.current?.kind !== 'scene') return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setCue({ kind: 'scene', beforeId }); };
  const drop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); const payload = dragRef.current;
    if (payload?.kind === 'panels' && cue?.kind === 'panels') onMove(payload.ids, cue.sceneId, cue.beforeId);
    if (payload?.kind === 'scene' && cue?.kind === 'scene') onMoveScene(payload.id, cue.beforeId);
    end();
  };
  const toggle = (id: string, checked: boolean) => onSelection(checked ? [...new Set([...selectedIds, id])] : selectedIds.filter(p => p !== id));
  const sceneMarker = (beforeId: string | null) => <div className={`scene-drop-marker ${cue?.kind === 'scene' && cue.beforeId === beforeId ? 'active' : ''}`} onDragOver={e => sceneCue(e, beforeId)} onDrop={drop} aria-label={`Insert scene ${beforeId ? 'before this scene' : 'at end'}`} />;
  const slot = (s: Scene, beforeId: string | null) => <div className={`panel-drop-slot ${cue?.kind === 'panels' && cue.sceneId === s.id && cue.beforeId === beforeId ? 'active' : ''}`} data-scene-id={s.id} data-before-panel={beforeId || 'end'} aria-label={`Insert panels ${beforeId ? `before ${s.panels.find(p => p.id === beforeId)?.name}` : 'at end'} in ${s.name}`} onDragOver={e => panelCue(e, s, beforeId)} onDrop={drop}><span>Insert here</span></div>;
  const sceneHeading = (s: Scene, sceneIndex: number) => (<div className={grid ? 'scene-title' : 'film-scene-title'} onDragOver={e => { if (dragRef.current?.kind === 'scene') sceneCue(e, s.id); else panelCue(e, s, s.panels[0]?.id || null); }} onDrop={drop}>
        <button className="scene-drag-handle" draggable onDragStart={e => begin(e, { kind: 'scene', id: s.id })} onDragEnd={end} title={`Drag scene ${s.name}`} aria-label={`Drag scene ${s.name}`}>⠿</button><h2>{s.name}</h2><span>{s.panels.length} panels · {timecode(sceneFrames(s), project.fps)}</span>
        <button className="scene-order-button" disabled={sceneIndex === 0} title={`Move scene ${s.name} earlier`} onClick={() => onMoveScene(s.id, project.scenes[sceneIndex - 1].id)}>←</button>
        <button className="scene-order-button" disabled={sceneIndex === project.scenes.length - 1} title={`Move scene ${s.name} later`} onClick={() => onMoveScene(s.id, project.scenes[sceneIndex + 2]?.id || null)}>→</button>
      </div>);
  return <div className={`${grid ? 'panel-overview continuous-panels' : 'filmstrip-scroll drawing-filmstrip'} ${dragging?.kind === 'scene' ? 'dragging-scenes' : ''}`} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCue(null); }}>
    {project.scenes.map((s, sceneIndex) => <section className={`${grid ? 'scene-grid' : 'film-scene'} ${project.scenes.length > 1 && sceneIndex % 2 === 1 ? 'scene-shaded' : ''}`} key={s.id} data-scene-id={s.id}>
      {sceneMarker(s.id)}
      {!grid && sceneHeading(s, sceneIndex)}
      <div className={grid ? 'panel-grid reorder-grid' : 'film-scene-panels'}>
        {s.panels.map((p, index) => <div className="panel-position" key={p.id}>
          {grid && index === 0 && sceneHeading(s, sceneIndex)}
          {project.transitions.filter(t=>t.toId===p.id).map(t=><TransitionMarker key={t.id} transition={t} selected={transitionId===t.id} onSelect={()=>onTransition(t.id)}/>)}
          {slot(s, p.id)}
          <article data-panel-id={p.id} title={`${s.name} / ${p.name} · Position ${index + 1}`} className={`panel-card ${activeId === p.id ? 'selected' : ''} ${grid ? 'grid-card' : ''} ${grid && selectedIds.includes(p.id) ? 'batch-selected' : ''} ${dragging?.kind === 'panels' && dragging.ids.includes(p.id) ? 'being-dragged' : ''}`} draggable onDragStart={e => { if ((e.target as HTMLElement).closest('.mini-layers, input')) { e.preventDefault(); return; } begin(e, { kind: 'panels', ids: grid && selectedIds.includes(p.id) ? allPanels(project).map(p => p.panel.id).filter(id => selectedIds.includes(id)) : [p.id] }); }} onDragEnd={end} onDragOver={e => { const rect = e.currentTarget.getBoundingClientRect(); panelCue(e, s, e.clientX < rect.left + rect.width / 2 ? p.id : s.panels[index + 1]?.id || null); }} onDrop={drop}>
            {grid && <label className="panel-batch-checkbox"><input type="checkbox" aria-label={`Select ${s.name} / ${p.name} for move`} checked={selectedIds.includes(p.id)} onChange={e => toggle(p.id, e.target.checked)} /></label>}
            <button className="panel-image-button" onClick={e => { if (grid && (e.ctrlKey || e.metaKey)) toggle(p.id, !selectedIds.includes(p.id)); else if (grid && e.shiftKey) { const ids = allPanels(project).map(p => p.panel.id), a = ids.indexOf(activeId), b = ids.indexOf(p.id); onSelection(ids.slice(Math.min(Math.max(a, 0), b), Math.max(a, b) + 1)); } onSelect(p.id); }} aria-label={`Select ${s.name}, ${p.name}`}><div className="panel-card-meta"><span>{s.name} / {p.name}</span><span>{timecode(p.duration, project.fps)}</span></div><Thumbnail panel={p} project={project} /></button>
            {renderLayers(p)}
          </article>
          {grid && index === s.panels.length - 1 && <div className="continuous-scene-end" onDragOver={e => panelCue(e, s, null)} onDrop={drop} aria-label={`Move panels to end of ${s.name}`}>{slot(s, null)}</div>}
        </div>)}
        <div className={`scene-end-drop ${s.panels.length === 0 ? 'empty-scene' : ''}`} style={grid && s.panels.length ? { display: 'none' } : undefined} onDragOver={e => panelCue(e, s, null)} onDrop={drop} aria-label={`Move panels to end of ${s.name}`}>{grid && !s.panels.length && sceneHeading(s, sceneIndex)}{slot(s, null)}<span>{s.panels.length ? '+' : 'Drop panels here'}</span></div>
      </div>
    </section>)}
    <div className={`storyboard-end-drop ${dragging?.kind === 'scene' ? 'visible' : ''}`} onDragOver={e => sceneCue(e, null)} onDrop={drop}>{sceneMarker(null)}<span>Move scene to end</span></div>
  </div>;
}
