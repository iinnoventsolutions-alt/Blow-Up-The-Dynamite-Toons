import { cameraAt, type CameraKey, type Project, type Scene, type StaticCameraPose } from './model.ts';

// RFU4-RA.4B phase 1: opt-in, pure sequential camera model.
// Legacy scene.camera and panel.staticCamera are deliberately untouched.
export type CameraPose = StaticCameraPose;
export type PanelCameraKey = Pick<CameraKey,'frame'|'x'|'y'|'zoom'|'rotation'|'interpolation'>;
// Animated key coordinates are deltas from the panel's inherited IN pose.
// Zoom is multiplicative; rotation and position are additive.
export type RelativeCameraKey = PanelCameraKey;
export const cameraOffset=(origin:CameraPose,target:CameraPose):CameraPose=>({x:target.x-origin.x,y:target.y-origin.y,zoom:target.zoom/origin.zoom,rotation:target.rotation-origin.rotation});
export const applyCameraOffset=(origin:CameraPose,offset:CameraPose):CameraPose=>({x:origin.x+offset.x,y:origin.y+offset.y,zoom:origin.zoom*offset.zoom,rotation:origin.rotation+offset.rotation});
export type PanelCameraState =
  | {mode:'inherit'}
  | {mode:'static';pose:CameraPose}
  | {mode:'animated';keys:RelativeCameraKey[]}
  | {mode:'break';pose:CameraPose};
export type SequentialCameraScene = {
  baseline?:CameraPose;
  panels:Record<string,PanelCameraState>;
};
const clone=(p:CameraPose):CameraPose=>({x:p.x,y:p.y,zoom:p.zoom,rotation:p.rotation});
export const defaultCamera=(project:Pick<Project,'width'|'height'>):CameraPose=>({x:project.width/2,y:project.height/2,zoom:1,rotation:0});
const fields=['x','y','zoom','rotation'] as const;
const interpolate=(a:CameraPose,b:CameraPose,t:number):CameraPose=>Object.fromEntries(fields.map(k=>[k,a[k]+(b[k]-a[k])*t])) as CameraPose;
const valid=(p:CameraPose)=>fields.every(k=>Number.isFinite(p[k]))&&p.zoom>=.01&&p.zoom<=100&&p.x>=-8192&&p.x<=16384&&p.y>=-8192&&p.y<=16384&&p.rotation>=-36000&&p.rotation<=36000;
export function resolveSequentialCamera(scene:Scene,project:Pick<Project,'width'|'height'>,config:SequentialCameraScene,panelId:string,localFrame:number){
  const baseline=clone(config.baseline??defaultCamera(project));
  if(!valid(baseline))throw new Error('Invalid sequential camera baseline.');
  let inherited=baseline;
  for(const panel of scene.panels){
    const state=config.panels[panel.id]??{mode:'inherit' as const};
    const start=clone(inherited);
    let at:(frame:number)=>CameraPose=()=>clone(start);
    if(state.mode==='static'||state.mode==='break'){
      if(!valid(state.pose))throw new Error('Invalid sequential static camera pose.');
      at=()=>clone(state.pose);
    }else if(state.mode==='animated'){
      const keys=[...state.keys].sort((a,b)=>a.frame-b.frame);
      if(keys.some((k,i)=>!Number.isInteger(k.frame)||k.frame<1||k.frame>=panel.duration||![k.x,k.y,k.zoom,k.rotation].every(Number.isFinite)||k.zoom<=0||(i>0&&keys[i-1].frame===k.frame)||!['linear','hold','ease'].includes(k.interpolation)))throw new Error('Invalid sequential camera keyframes.');
      // Frame zero is locked to inherited IN; key poses are relative offsets.
      const frames=[{frame:0,...start,interpolation:'linear' as const},...keys.map(k=>({...k,...applyCameraOffset(start,k)}))];
      at=(frame:number)=>{
        const f=Math.max(0,Math.min(panel.duration-1,Math.floor(frame)));
        let i=0;while(i+1<frames.length&&frames[i+1].frame<=f)i++;
        const a=frames[i],b=frames[i+1];if(!b)return clone(a);
        let t=(f-a.frame)/(b.frame-a.frame);
        if(a.interpolation==='hold')t=0;
        if(a.interpolation==='ease')t=t*t*(3-2*t);
        return interpolate(a,b,t);
      };
    }
    const out=at(panel.duration-1);
    if(panel.id===panelId)return {inPose:start,pose:at(localFrame),outPose:out,mode:state.mode};
    inherited=out;
  }
  throw new Error('Panel not found in sequential camera scene.');
}

// Explicit opt-in only. Never rewrite legacy scene.camera or panel.staticCamera.
export function enableSequentialCameraStorage(project:Project,sceneId:string):Project {
  const scene=project.scenes.find(s=>s.id===sceneId);
  if(!scene)throw new Error('Scene not found.');
  if(scene.camera.length||scene.panels.some(p=>p.staticCamera))throw new Error('Legacy camera data requires visual-preserving conversion before enabling sequential storage.');
  const next=structuredClone(project);
  next.schemaVersion=5;
  const target=next.scenes.find(s=>s.id===sceneId)!;
  target.sequentialCamera??={version:1,panels:{}};
  return next;
}

/** Conservative legacy migration: convert only scenes whose sampled camera
 * appearance is constant per panel and sequentially continuous. Complex
 * cross-panel motion remains on the legacy renderer without modification. */
export function assessLegacyCameraMigration(project:Project,sceneId:string):{safe:boolean;reason?:string;project?:Project}{
  const scene=project.scenes.find(s=>s.id===sceneId);
  if(!scene)return {safe:false,reason:'Scene not found.'};
  if(scene.sequentialCamera)return {safe:false,reason:'Scene already uses sequential camera storage.'};
  if(scene.camera.length)return {safe:false,reason:'Scene-level keyframes require visual-equivalence conversion; retain legacy playback.'};
  if(scene.panels.some(p=>p.staticCamera))return {safe:false,reason:'Independent static panel cameras require explicit continuity review; retain legacy playback.'};
  return {safe:true,project:enableSequentialCameraStorage(project,sceneId)};
}

/** Frame-exact migration preflight. Refuses any scene that cannot be proven
 * visually identical under the locked-IN sequential model. Never mutates input. */
export function compareLegacyCameraFrames(project:Project,sceneId:string,config:SequentialCameraScene,tolerance=1e-7){
  const scene=project.scenes.find(s=>s.id===sceneId);
  if(!scene)return {equivalent:false,reason:'Scene not found.',framesChecked:0};
  if(scene.panels.some(p=>p.staticCamera))return {equivalent:false,reason:'Independent static camera needs explicit review.',framesChecked:0};
  const count=scene.panels.reduce((n,p)=>n+p.duration,0);
  if(count>10000)return {equivalent:false,reason:'Scene exceeds the 10,000-frame verification budget.',framesChecked:0};
  let absolute=0;
  for(const panel of scene.panels)for(let local=0;local<panel.duration;local++,absolute++){
    const legacy=cameraAt(scene,absolute,project);
    let sequential:CameraPose;
    try{sequential=resolveSequentialCamera(scene,project,config,panel.id,local).pose;}
    catch{return {equivalent:false,reason:'Invalid sequential camera candidate.',framesChecked:absolute};}
    if(fields.some(k=>Math.abs(legacy[k]-sequential[k])>tolerance))
      return {equivalent:false,reason:'Camera appearance differs.',framesChecked:absolute+1,firstMismatch:{panelId:panel.id,frame:local,legacy,sequential}};
  }
  return {equivalent:true,framesChecked:absolute};
}
/** Only constant legacy animation is eligible for automatic conversion.
 * Nonconstant linear/ease/hold and cross-panel animation remain legacy. */
export function migrateVisuallyEquivalentLegacyCamera(project:Project,sceneId:string){
  const scene=project.scenes.find(s=>s.id===sceneId);
  if(!scene)return {safe:false,reason:'Scene not found.'};
  if(scene.sequentialCamera)return {safe:false,reason:'Sequential storage already enabled.'};
  if(scene.panels.some(p=>p.staticCamera))return {safe:false,reason:'Independent static camera needs explicit review.'};
  const first=cameraAt(scene,0,project);
  const candidate:SequentialCameraScene={baseline:clone(first),panels:{}};
  const check=compareLegacyCameraFrames(project,sceneId,candidate);
  if(!check.equivalent)return {safe:false,reason:check.reason,framesChecked:check.framesChecked};
  const next=structuredClone(project);next.schemaVersion=5;
  const target=next.scenes.find(s=>s.id===sceneId)!;
  target.sequentialCamera={version:1,...candidate};
  // Preserve original legacy keys for fallback and historical fidelity.
  return {safe:true,project:next,framesChecked:check.framesChecked};
}

/** Scene-local compatibility dispatch. Existing projects continue using the
 * legacy camera evaluator unless that scene explicitly opts in to sequential. */
export function resolveCompatibleCamera(project:Project,sceneId:string,panelId:string,localFrame:number){
 const scene=project.scenes.find(s=>s.id===sceneId);
 if(!scene)throw new Error('Scene not found.');
 const panelIndex=scene.panels.findIndex(p=>p.id===panelId);
 if(panelIndex<0)throw new Error('Panel not found.');
 const panel=scene.panels[panelIndex];
 const frame=Math.max(0,Math.min(panel.duration-1,Math.floor(localFrame)));
 if(scene.sequentialCamera){
  if(project.schemaVersion!==5)throw new Error('Sequential camera requires schema 5.');
  const result=resolveSequentialCamera(scene,project,scene.sequentialCamera,panelId,frame);
  return {...result,engine:'sequential' as const};
 }
 const absolute=scene.panels.slice(0,panelIndex).reduce((sum,p)=>sum+p.duration,0)+frame;
 const legacy=cameraAt(scene,absolute,project);
 // The preexisting static-camera overlay takes priority only when the scene
 // has no animation keys; do not change the legacy keyed-scene evaluator.
 const pose=scene.camera.length===0&&panel.staticCamera?clone(panel.staticCamera):clone(legacy);
 return {inPose:pose,pose,outPose:pose,mode:'legacy' as const,engine:'legacy' as const};
}

/** RFU4-RA.4C.2B: immutable, panel-owned OUT write.
 * Frame zero is inherited and never stored as an editable key. */
export function setSequentialCameraOut(project:Project,sceneId:string,panelId:string,target:CameraPose):Project {
  const scene=project.scenes.find(s=>s.id===sceneId);
  if(!scene?.sequentialCamera || project.schemaVersion!==5)throw new Error('Sequential camera storage is not enabled.');
  const panel=scene.panels.find(p=>p.id===panelId);
  if(!panel || panel.duration<2)throw new Error('Animated OUT requires a panel of at least two frames.');
  if(!valid(target))throw new Error('Invalid sequential camera OUT pose.');
  const state=scene.sequentialCamera.panels[panelId];
  if(state?.mode!=='animated')throw new Error('Panel does not have an animated camera OUT.');
  const inherited=resolveSequentialCamera(scene,project,scene.sequentialCamera,panelId,0).inPose;
  const offset=cameraOffset(inherited,target);
  const endFrame=panel.duration-1;
  const keys=state.keys.filter(k=>k.frame!==endFrame).map(k=>({...k}));
  const previous=state.keys.find(k=>k.frame===endFrame);
  keys.push({frame:endFrame,...offset,interpolation:previous?.interpolation??'linear'});
  keys.sort((a,b)=>a.frame-b.frame);
  const next:Project={...project,scenes:project.scenes.map(s=>s.id!==sceneId?s:{
    ...s,sequentialCamera:{...s.sequentialCamera!,panels:{...s.sequentialCamera!.panels,
      [panelId]:{mode:'animated' as const,keys}
    }}
  })};
  // Re-evaluate downstream inheritance before returning; invalid geometry rejects atomically.
  const nextScene=next.scenes.find(s=>s.id===sceneId)!;
  for(const downstream of nextScene.panels)resolveSequentialCamera(nextScene,next,nextScene.sequentialCamera!,downstream.id,downstream.duration-1);
  return next;
}

/** Set a static panel camera without changing the inherited upstream camera. */
export function setSequentialStaticCamera(project:Project,sceneId:string,panelId:string,pose:CameraPose):Project {
 const scene=project.scenes.find(s=>s.id===sceneId);
 if(!scene?.sequentialCamera||project.schemaVersion!==5)throw new Error('Sequential camera storage is not enabled.');
 if(!scene.panels.some(p=>p.id===panelId))throw new Error('Panel not found.');
 if(!valid(pose))throw new Error('Invalid static camera pose.');
 const current=scene.sequentialCamera.panels[panelId];
 if(current?.mode==='animated')throw new Error('Animated camera must be edited through OUT.');
 const next:Project={...project,scenes:project.scenes.map(s=>s.id!==sceneId?s:{...s,sequentialCamera:{...s.sequentialCamera!,panels:{...s.sequentialCamera!.panels,[panelId]:{mode:'static' as const,pose:clone(pose)}}}})};
 const updated=next.scenes.find(s=>s.id===sceneId)!;
 for(const panel of updated.panels)resolveSequentialCamera(updated,next,updated.sequentialCamera!,panel.id,panel.duration-1);
 return next;
}

/** Activate panel-owned IN/OUT animation from its current static/inherited pose.
 * IN remains inherited and locked; OUT starts visually identical until edited. */
export function enableSequentialPanelAnimation(project:Project,sceneId:string,panelId:string):Project {
 const scene=project.scenes.find(s=>s.id===sceneId);
 if(!scene?.sequentialCamera||project.schemaVersion!==5)throw new Error('Sequential camera storage is not enabled.');
 const panel=scene.panels.find(p=>p.id===panelId);
 if(!panel||panel.duration<2)throw new Error('Camera animation requires a panel of at least two frames.');
 const existing=scene.sequentialCamera.panels[panelId];
 if(existing?.mode==='animated')return project;
 const resolved=resolveSequentialCamera(scene,project,scene.sequentialCamera,panelId,0);
 const pose=existing?.mode==='static'||existing?.mode==='break'?existing.pose:resolved.inPose;
 // Preserve current static appearance at activation without changing downstream panels.
 const offset=cameraOffset(resolved.inPose,pose);
 const next:Project={...project,scenes:project.scenes.map(s=>s.id!==sceneId?s:{...s,sequentialCamera:{...s.sequentialCamera!,panels:{...s.sequentialCamera!.panels,[panelId]:{mode:'animated' as const,keys:[{frame:panel.duration-1,...offset,interpolation:'linear' as const}]}}}})};
 const updated=next.scenes.find(s=>s.id===sceneId)!;
 for(const p of updated.panels)resolveSequentialCamera(updated,next,updated.sequentialCamera!,p.id,p.duration-1);
 return next;
}

/** Intermediate camera keys reuse the existing panel-relative sequential animation model. */
export function setSequentialIntermediateKey(project:Project,sceneId:string,panelId:string,frame:number,pose?:CameraPose):Project {
 const scene=project.scenes.find(s=>s.id===sceneId);
 if(!scene?.sequentialCamera||project.schemaVersion!==5)throw new Error('Sequential camera storage is not enabled.');
 const panel=scene.panels.find(p=>p.id===panelId);
 if(!panel||!Number.isInteger(frame)||frame<=0||frame>=panel.duration-1)throw new Error('Intermediate key must be strictly between IN and OUT.');
 const state=scene.sequentialCamera.panels[panelId];
 if(state?.mode!=='animated')throw new Error('Activate IN/OUT before adding intermediate keys.');
 const current=resolveSequentialCamera(scene,project,scene.sequentialCamera,panelId,frame);
 const target=pose??current.pose;
 if(!valid(target))throw new Error('Invalid intermediate camera pose.');
 const old=state.keys.find(k=>k.frame===frame);
 const keys=[...state.keys.filter(k=>k.frame!==frame),{frame,...cameraOffset(current.inPose,target),interpolation:old?.interpolation??'linear' as const}].sort((a,b)=>a.frame-b.frame);
 const next:Project={...project,scenes:project.scenes.map(s=>s.id!==sceneId?s:{...s,sequentialCamera:{...s.sequentialCamera!,panels:{...s.sequentialCamera!.panels,[panelId]:{mode:'animated' as const,keys}}}})};
 const updated=next.scenes.find(s=>s.id===sceneId)!;
 for(const p of updated.panels)resolveSequentialCamera(updated,next,updated.sequentialCamera!,p.id,p.duration-1);
 return next;
}
export function deleteSequentialIntermediateKey(project:Project,sceneId:string,panelId:string,frame:number):Project {
 const scene=project.scenes.find(s=>s.id===sceneId);
 if(!scene?.sequentialCamera||project.schemaVersion!==5)throw new Error('Sequential camera storage is not enabled.');
 const panel=scene.panels.find(p=>p.id===panelId);
 if(!panel||!Number.isInteger(frame)||frame<=0||frame>=panel.duration-1)throw new Error('Cannot delete inherited IN or final OUT.');
 const state=scene.sequentialCamera.panels[panelId];
 if(state?.mode!=='animated'||!state.keys.some(k=>k.frame===frame))throw new Error('Intermediate key not found.');
 const keys=state.keys.filter(k=>k.frame!==frame);
 return {...project,scenes:project.scenes.map(s=>s.id!==sceneId?s:{...s,sequentialCamera:{...s.sequentialCamera!,panels:{...s.sequentialCamera!.panels,[panelId]:{mode:'animated' as const,keys}}}})};
}
