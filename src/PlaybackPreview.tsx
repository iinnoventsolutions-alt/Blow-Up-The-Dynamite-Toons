import { useEffect,useRef } from 'react';
import { findPanel,panelAtFrame,type Project } from './model';
import { preloadImages } from './render';
import { transitionAt } from './transitions';
import { paintPlayback } from './playback-render';
export default function PlaybackPreview({project,frame}:{project:Project;frame:number}){const ref=useRef<HTMLCanvasElement>(null),buffers=useRef<HTMLCanvasElement[]>([]);useEffect(()=>{let active=true;const panel=panelAtFrame(project,frame).panel,mix=transitionAt(project,frame),incoming=mix?findPanel(project,mix.transition.toId)?.panel:undefined;Promise.all([preloadImages(panel),...(incoming?[preloadImages(incoming)]:[])]).then(()=>{if(active&&ref.current)paintPlayback(ref.current,project,frame,Math.min(project.width,1920),buffers.current);}).catch(()=>{});return()=>{active=false;};},[project,frame]);return <div className="thumbnail camera-preview"><canvas ref={ref} aria-label="Storyboard playback preview"/></div>;}
