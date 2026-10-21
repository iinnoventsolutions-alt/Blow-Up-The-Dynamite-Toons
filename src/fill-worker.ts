import {floodMask,maskContours} from './flood';
type Request={id:number;pixels:ArrayBuffer;width:number;height:number;x:number;y:number;tolerance:number;gap:number;scaleX:number;scaleY:number};
// timeOrigin-based stamps are comparable between the renderer and worker.
self.onmessage=(event:MessageEvent<Request>)=>{
 const receivedAt=performance.timeOrigin+performance.now();
 const q=event.data;
 try{
  const start=performance.now();
  const mask=floodMask(new Uint8ClampedArray(q.pixels),q.width,q.height,q.x,q.y,q.tolerance,q.gap);
  const afterMask=performance.now();
  const contours=maskContours(mask,q.width,q.height,q.scaleX,q.scaleY);
  const afterContours=performance.now();
  const responseAt=performance.timeOrigin+performance.now();
  self.postMessage({id:q.id,contours,maskMs:afterMask-start,contourMs:afterContours-afterMask,receivedAt,responseAt});
 }catch(error){
  self.postMessage({id:q.id,error:error instanceof Error?error.message:String(error)});
 }
};
