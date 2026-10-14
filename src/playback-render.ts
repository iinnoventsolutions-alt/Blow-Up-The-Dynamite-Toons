import { cameraAt,findPanel,panelAtFrame,panelStart,type Project } from './model';
import { sceneStart } from './camera';
import { drawPanel } from './render';
import { transitionAt } from './transitions';
export function paintPlayback(canvas:HTMLCanvasElement,project:Project,frame:number,width=Math.min(project.width,1920),buffers:HTMLCanvasElement[]=[]){
const outgoing=panelAtFrame(project,frame),mix=transitionAt(project,frame),incoming=mix?findPanel(project,mix.transition.toId):undefined;
const height=Math.max(1,Math.round(width*project.height/project.width));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}const ctx=canvas.getContext('2d')!;
 const render=(entry:typeof outgoing,f:number,index:number)=>{const c=buffers[index]||(buffers[index]=document.createElement('canvas'));drawPanel(c,entry.panel,project,{width,camera:cameraAt(entry.scene,f-sceneStart(project,entry.scene),project)});return c;};
 const a=render(outgoing,frame,0);ctx.drawImage(a,0,0);if(!mix||!incoming)return;const b=render(incoming,panelStart(project,incoming.panel.id),1),t=mix.progress,d=mix.transition.direction;
 ctx.save();if(mix.transition.type==='dissolve'){ctx.globalAlpha=t;ctx.drawImage(b,0,0);}
 else if(mix.transition.type==='edge-wipe'){ctx.beginPath();if(d==='right')ctx.rect(0,0,width*t,height);if(d==='left')ctx.rect(width*(1-t),0,width*t,height);if(d==='down')ctx.rect(0,0,width,height*t);if(d==='up')ctx.rect(0,height*(1-t),width,height*t);ctx.clip();ctx.drawImage(b,0,0);}
 else if(mix.transition.type==='clock-wipe'){if(t>=1)ctx.drawImage(b,0,0);else if(t>0){const angle={up:-Math.PI/2,right:0,down:Math.PI/2,left:Math.PI}[d];ctx.beginPath();ctx.moveTo(width/2,height/2);ctx.arc(width/2,height/2,Math.hypot(width,height),angle,angle+t*Math.PI*2);ctx.closePath();ctx.clip();ctx.drawImage(b,0,0);}}
 else {ctx.clearRect(0,0,width,height);const x=d==='right'?1:d==='left'?-1:0,y=d==='down'?1:d==='up'?-1:0;ctx.drawImage(a,x*width*t,y*height*t);ctx.drawImage(b,-x*width*(1-t),-y*height*(1-t));}ctx.restore();
}
