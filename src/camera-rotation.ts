import type {CameraPose} from './camera';

/** Screen-independent rotation geometry shared by legacy and sequential overlays. */
export function cameraRotationHandle(pose:CameraPose, corners:[number,number][], offset:number){
 const x=(corners[0][0]+corners[1][0])/2,y=(corners[0][1]+corners[1][1])/2;
 const dx=x-pose.x,dy=y-pose.y,length=Math.hypot(dx,dy)||1;
 return {x:x+dx/length*offset,y:y+dy/length*offset,anchorX:x,anchorY:y};
}
export const pointerAngle=(x:number,y:number,pose:CameraPose)=>Math.atan2(y-pose.y,x-pose.x)*180/Math.PI;
export function rotateCamera(origin:CameraPose,startAngle:number,currentAngle:number,snap=false):CameraPose{
 const delta=((currentAngle-startAngle+540)%360)-180;
 const angle=origin.rotation+delta;
 return {...origin,rotation:snap?Math.round(angle/15)*15:angle};
}
