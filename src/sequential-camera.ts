import type { CameraKey, Project, Scene, StaticCameraPose } from './model.ts';

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
