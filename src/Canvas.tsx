import DrawingStage from './DrawingStage';
export { DrawingStage as DrawingCanvas };
export type { Tool } from './artwork';
import CameraOverlay from './CameraOverlay';
import { sceneStart } from './camera';
import { useEffect, useRef } from 'react';
import { cameraAt, findPanel, type Panel, type Project } from './model';
import { drawPanel, preloadImages } from './render';
export function Thumbnail({ panel, project, frame, cameraView = false }: { panel: Panel; project: Project; frame?: number; cameraView?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null), scene = findPanel(project, panel.id)!.scene;
  const localFrame = Math.max(0, Math.min(scene.panels.reduce((n,p)=>n+p.duration,0)-1, (frame ?? 0) - sceneStart(project,scene)));
  useEffect(() => { let active = true; preloadImages(panel).then(() => { if (active && ref.current) drawPanel(ref.current, panel, project, { width: cameraView ? Math.min(project.width,1920) : 320, camera: cameraView ? cameraAt(scene,localFrame,project) : undefined }); }).catch(() => {}); return () => { active = false; }; }, [panel, project.width, project.height, scene.camera, localFrame, cameraView]);
  return <div className={`thumbnail ${cameraView ? 'camera-preview' : ''}`}><canvas ref={ref} aria-label={`${panel.name} drawing preview`} />{!cameraView && scene.camera.length > 0 && <CameraOverlay scene={scene} panel={panel} project={project}/>}</div>;
}
