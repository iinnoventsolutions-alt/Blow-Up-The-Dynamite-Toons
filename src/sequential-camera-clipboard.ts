import type {Project, Scene} from './model.ts';
import {resolveCompatibleCamera, resolveSequentialCamera, type PanelCameraState, type RelativeCameraKey} from './sequential-camera.ts';
import type {CameraPose} from './camera.ts';

/** RB1: immutable, panel-scoped sequential camera clipboard. No artwork or other panel data. */
export type SequentialCameraClipboard = {
  kind:'sequential-camera'; version:1; duration:number;
  state:PanelCameraState;
  /** The visible source framing, retained when an inherited camera is copied. */
  sourceIn:CameraPose;
};
const pose=(p:CameraPose):CameraPose=>({x:p.x,y:p.y,zoom:p.zoom,rotation:p.rotation});
const cloneState=(state:PanelCameraState):PanelCameraState=>
 state.mode==='animated'?{mode:'animated',...(state.inPose?{inPose:pose(state.inPose)}:{}),keys:state.keys.map(k=>({...k}))}:
 state.mode==='static'||state.mode==='break'?{mode:state.mode,pose:pose(state.pose)}:{mode:'inherit'};

export function copySequentialPanelCamera(project:Project,sceneId:string,panelId:string):SequentialCameraClipboard {
 const scene=project.scenes.find(s=>s.id===sceneId);
 if(!scene?.sequentialCamera||project.schemaVersion!==5)throw new Error('Sequential camera storage is required for RB1 copy.');
 const panel=scene.panels.find(p=>p.id===panelId);
 if(!panel)throw new Error('Source panel not found.');
 const state=scene.sequentialCamera.panels[panelId]??{mode:'inherit' as const};
 const resolved=resolveCompatibleCamera(project,sceneId,panelId,0);
 return {kind:'sequential-camera',version:1,duration:panel.duration,state:cloneState(state),sourceIn:pose(resolved.pose)};
}

function retime(keys:RelativeCameraKey[],sourceDuration:number,destDuration:number):RelativeCameraKey[] {
 if(sourceDuration<2||destDuration<2)throw new Error('Animated camera paste requires source and destination panels of at least two frames.');
 const mapped=keys.map(k=>({...k,frame:Math.round(k.frame*(destDuration-1)/(sourceDuration-1))}));
 if(mapped.some(k=>k.frame<1||k.frame>=destDuration))throw new Error('Destination duration cannot accommodate the camera keyframes.');
 if(new Set(mapped.map(k=>k.frame)).size!==mapped.length)throw new Error('Destination duration is too short to preserve distinct camera keyframes.');
 return mapped.sort((a,b)=>a.frame-b.frame);
}

/** Replace only destination camera state. Returns a new project for one history commit.
 * Pasted animation pins its source IN and preserves relative keys against that IN.
 * Ordinary (non-pasted) animated panels retain sequential inherited-IN behavior.
 * Inherited static framing is materialized to reproduce its source appearance. */
export function pasteSequentialPanelCamera(project:Project,sceneId:string,panelId:string,clip:SequentialCameraClipboard):Project {
 if(clip?.kind!=='sequential-camera'||clip.version!==1)throw new Error('Unsupported camera clipboard.');
 const scene=project.scenes.find(s=>s.id===sceneId);
 if(!scene?.sequentialCamera||project.schemaVersion!==5)throw new Error('Sequential camera storage is required for RB1 paste.');
 const panel=scene.panels.find(p=>p.id===panelId);
 if(!panel)throw new Error('Destination panel not found.');
 const state:PanelCameraState=clip.state.mode==='animated'?
   {mode:'animated',inPose:pose(clip.sourceIn),keys:retime(clip.state.keys,clip.duration,panel.duration)}:
   clip.state.mode==='inherit'?{mode:'static',pose:pose(clip.sourceIn)}:cloneState(clip.state);
 const next:Project={...project,scenes:project.scenes.map(s=>s.id!==sceneId?s:{
  ...s,sequentialCamera:{...s.sequentialCamera!,panels:{...s.sequentialCamera!.panels,[panelId]:state}}
 })};
 const updated=next.scenes.find(s=>s.id===sceneId)!;
 // Validate every downstream pose before returning; failures leave input untouched.
 for(const p of updated.panels)resolveSequentialCamera(updated,next,updated.sequentialCamera!,p.id,p.duration-1);
 return next;
}
