import {useEffect,useRef,useState} from 'react';
import type {PointerEvent} from 'react';
import type {Project} from './model';
import type {CameraPose} from './camera';
import {cameraCorners} from './camera';

type Drag={pointerId:number;mode:'pan'|'zoom';origin:CameraPose;x:number;y:number;radius:number};
const equal=(a:CameraPose,b:CameraPose)=> (['x','y','zoom','rotation'] as const).every(k=>Math.abs(a[k]-b[k])<1e-7);

/** Sequential OUT is the only draggable endpoint; inherited IN is never interactive. */
export default function SequentialCameraOutOverlay({project,inPose,outPose,editable,onChange,drawingMargin=.25,staticMode=false,intermediateMode=false}:{
 project:Project;inPose:CameraPose;outPose:CameraPose;editable:boolean;onChange:(pose:CameraPose)=>void;drawingMargin?:number;staticMode?:boolean;intermediateMode?:boolean;
}){
 const [live,setLive]=useState<CameraPose|null>(null);
 const liveRef=useRef<CameraPose|null>(null);
 const pending=useRef<CameraPose|null>(null);
 const drag=useRef<Drag|null>(null);
 useEffect(()=>{if(pending.current&&equal(outPose,pending.current)){pending.current=null;liveRef.current=null;setLive(null);}},[outPose]);
 const point=(e:PointerEvent<SVGSVGElement>)=>{const m=e.currentTarget.getScreenCTM();if(!m)return null;const determinant=m.a*m.d-m.b*m.c;if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-12)return null;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse());return Number.isFinite(p.x)&&Number.isFinite(p.y)?p:null;};
 const begin=(e:PointerEvent<SVGSVGElement>)=>{if(!editable||e.button!==0)return;const target=e.target as SVGElement;if(!target.hasAttribute('data-mode'))return;const p=point(e);if(!p)return;e.preventDefault();e.stopPropagation();const origin=liveRef.current??outPose;drag.current={pointerId:e.pointerId,mode:target.dataset.mode==='zoom'?'zoom':'pan',origin,x:p.x,y:p.y,radius:Math.hypot(p.x-origin.x,p.y-origin.y)};e.currentTarget.setPointerCapture(e.pointerId);};
 const move=(e:PointerEvent<SVGSVGElement>)=>{const d=drag.current;if(!d||d.pointerId!==e.pointerId)return;const p=point(e);if(!p)return;const pose=d.mode==='pan'?{...d.origin,x:Math.max(-8192,Math.min(16384,d.origin.x+p.x-d.x)),y:Math.max(-8192,Math.min(16384,d.origin.y+p.y-d.y))}:{...d.origin,zoom:Math.max(.01,Math.min(100,d.origin.zoom*d.radius/Math.max(1,Math.hypot(p.x-d.origin.x,p.y-d.origin.y))))};liveRef.current=pose;setLive(pose);};
 const commit=()=>{const d=drag.current;if(!d)return;drag.current=null;const pose=liveRef.current;if(!pose||equal(pose,d.origin)){liveRef.current=null;setLive(null);return;}pending.current=pose;onChange(pose);};
 const finish=(e:PointerEvent<SVGSVGElement>)=>{if(drag.current?.pointerId!==e.pointerId)return;move(e);commit();};
 const cancel=(e:PointerEvent<SVGSVGElement>)=>{if(drag.current?.pointerId!==e.pointerId)return;drag.current=null;pending.current=null;liveRef.current=null;setLive(null);};
 const lost=(e:PointerEvent<SVGSVGElement>)=>{if(drag.current?.pointerId===e.pointerId)commit();};
 const pose=live??outPose,corners=cameraCorners(pose,project),incoming=cameraCorners(inPose,project),handle=Math.max(project.width,project.height)/100;
 return <svg className="camera-sequential-out-overlay" aria-label="Sequential camera OUT handles" viewBox={`${-project.width*drawingMargin} ${-project.height*drawingMargin} ${project.width*(1+2*drawingMargin)} ${project.height*(1+2*drawingMargin)}`} preserveAspectRatio="none" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={lost} onKeyDown={e=>{if(e.key==='Escape'){drag.current=null;pending.current=null;liveRef.current=null;setLive(null);}}} tabIndex={editable?0:undefined} style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'visible',pointerEvents:editable?'auto':'none'}}>
  {!staticMode&&<polygon data-camera-endpoint="in" points={incoming.map(p=>p.join(',')).join(' ')} fill="none" stroke="#32c85b" strokeWidth={handle/5} pointerEvents="none"/>}
  {!staticMode&&<text x={incoming[0][0]+handle} y={incoming[0][1]+handle*1.7} fill="#32c85b" fontSize={handle*1.25} pointerEvents="none">IN · LOCKED</text>}
  <g data-camera-endpoint="out">
   <polygon data-mode="pan" points={corners.map(p=>p.join(',')).join(' ')} fill="none" stroke={staticMode?'#222222':intermediateMode?'#3889e8':'#ef4d50'} strokeWidth={handle/5} className="camera-frame" style={{pointerEvents:'stroke'}}/>
   <text x={corners[0][0]+handle} y={corners[0][1]+handle*1.7} fill={staticMode?'#222222':'#ef4d50'} fontSize={handle*1.25} pointerEvents="none">{staticMode?'STATIC':intermediateMode?'INTERMEDIATE':'OUT'}</text>
   {corners.map(([x,y],i)=><rect key={i} data-mode="zoom" x={x-handle/2} y={y-handle/2} width={handle} height={handle} fill={staticMode?'#222222':intermediateMode?'#3889e8':'#ef4d50'} className="camera-handle"/>)}
   <circle data-mode="pan" cx={pose.x} cy={pose.y} r={handle/2} fill="#ef4d50" className="camera-handle"/>
  </g>
 </svg>;
}
