import type {Point} from './model';
import {floodMask,maskContours} from './flood';

export type FillCalculation={contours:Point[][];maskMs:number;contourMs:number;waitMs:number;worker:boolean};
type Reply={id:number;contours?:Point[][];maskMs?:number;contourMs?:number;error?:string};
let sequence=0;
/** Transfer the pixel buffer rather than copying large canvases on the renderer thread. */
export async function calculateFill(pixels:Uint8ClampedArray,width:number,height:number,x:number,y:number,tolerance:number,gap:number,scaleX:number,scaleY:number):Promise<FillCalculation>{
 if(typeof Worker==='undefined'){
  const start=performance.now(),mask=floodMask(pixels,width,height,x,y,tolerance,gap),middle=performance.now();
  const contours=maskContours(mask,width,height,scaleX,scaleY);
  return {contours,maskMs:middle-start,contourMs:performance.now()-middle,waitMs:0,worker:false};
 }
 const started=performance.now(),id=++sequence;
 const worker=new Worker(new URL('./fill-worker.ts',import.meta.url),{type:'module'});
 return new Promise<FillCalculation>((resolve,reject)=>{
  let done=false;
  const fail=(error:Error)=>{if(done)return;done=true;worker.terminate();reject(error);};
  worker.onerror=event=>{event.preventDefault();fail(new Error('Background fill processing failed. Please try again.'));};
  worker.onmessage=(event:MessageEvent<Reply>)=>{
   const result=event.data;if(result.id!==id)return;
   if(result.error){fail(new Error(result.error));return;}
   done=true;worker.terminate();
   resolve({contours:result.contours||[],maskMs:result.maskMs||0,contourMs:result.contourMs||0,waitMs:performance.now()-started,worker:true});
  };
  try{
   const buffer=pixels.buffer;
   if(!(buffer instanceof ArrayBuffer))throw new Error('Unsupported fill pixel buffer.');
   worker.postMessage({id,pixels:buffer,width,height,x,y,tolerance,gap,scaleX,scaleY},[buffer]);
  }catch(error){fail(error instanceof Error?error:new Error(String(error)));}
 });
}
