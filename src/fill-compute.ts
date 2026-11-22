import type {Point} from './model';
import {floodMask,maskContours} from './flood';

export type FillCalculation={contours:Point[][];maskMs:number;contourMs:number;waitMs:number;worker:boolean;timing?:{postMessageMs:number;queueMs:number;returnMs:number;unattributedMs:number}};
type Reply={id:number;contours?:Point[][];maskMs?:number;contourMs?:number;receivedAt?:number;responseAt?:number;error?:string};
let sequence=0;
let sharedWorker:Worker|null=null;
const pending=new Map<number,{resolve:(r:FillCalculation)=>void;reject:(e:Error)=>void;started:number;sentAt:number;postMessageMs:number}>();
function resetWorker(error:Error){const old=sharedWorker;sharedWorker=null;old?.terminate();for(const p of pending.values())p.reject(error);pending.clear();}
function getWorker(){if(typeof Worker==='undefined')return null;if(sharedWorker)return sharedWorker;const w=new Worker(new URL('./fill-worker.ts',import.meta.url),{type:'module'});w.onerror=e=>{e.preventDefault();if(w===sharedWorker)resetWorker(new Error('Background fill failed.'));};w.onmessage=(e:MessageEvent<Reply>)=>{const data=e.data,p=pending.get(data.id);if(!p)return;pending.delete(data.id);if(data.error){p.reject(new Error(data.error));return;}const finished=performance.now();
 const elapsed=finished-p.started,maskMs=data.maskMs||0,contourMs=data.contourMs||0;
 // Worker and window have different monotonic time origins. Comparing epoch-aligned
 // stamps attributes message scheduling without altering the calculation path.
 const receivedAt=data.receivedAt,responseAt=data.responseAt;
 const aligned=Number.isFinite(receivedAt)&&Number.isFinite(responseAt);
 const queueMs=aligned?Math.max(0,receivedAt!-p.sentAt):0;
 const returnMs=aligned?Math.max(0,performance.timeOrigin+finished-responseAt!):0;
 const unattributedMs=Math.max(0,elapsed-p.postMessageMs-queueMs-maskMs-contourMs-returnMs);
 p.resolve({contours:data.contours||[],maskMs,contourMs,waitMs:elapsed,worker:true,
  timing:aligned?{postMessageMs:p.postMessageMs,queueMs,returnMs,unattributedMs}:undefined});};sharedWorker=w;return w;}
export function warmFillWorker(){try{getWorker();}catch{}}

/** Transfer the pixel buffer rather than copying large canvases on the renderer thread. */
export async function calculateFill(pixels:Uint8ClampedArray,width:number,height:number,x:number,y:number,tolerance:number,gap:number,scaleX:number,scaleY:number):Promise<FillCalculation>{
 const started=performance.now();const worker=getWorker();
 if(!worker){
  const mask=floodMask(pixels,width,height,x,y,tolerance,gap),middle=performance.now();
  const contours=maskContours(mask,width,height,scaleX,scaleY);
  return {contours,maskMs:middle-started,contourMs:performance.now()-middle,waitMs:0,worker:false};
 }
 const id=++sequence;
 return new Promise<FillCalculation>((resolve,reject)=>{
  const sentAt=performance.timeOrigin+performance.now();
  const entry={resolve,reject,started,sentAt,postMessageMs:0};
  pending.set(id,entry);
  try{
   const buffer=pixels.buffer;
   if(!(buffer instanceof ArrayBuffer))throw new Error('Unsupported fill pixel buffer.');
   worker.postMessage({id,pixels:buffer,width,height,x,y,tolerance,gap,scaleX,scaleY},[buffer]);
   entry.postMessageMs=performance.timeOrigin+performance.now()-sentAt;
  }catch(error){pending.delete(id);reject(error instanceof Error?error:new Error(String(error)));}
 });
}
export function disposeFillWorker(){if(sharedWorker||pending.size)resetWorker(new Error('Fill worker stopped.'));}
