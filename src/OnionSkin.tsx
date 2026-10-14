import { useEffect, useRef } from 'react';
import type { Panel, Project } from './model';
import { findPanel } from './model';
import { drawPanel, preloadImages } from './render';
import { onionPanels, type OnionSettings } from './onion';
export default function OnionSkin({panel,project,settings}:{panel:Panel;project:Project;settings:OnionSettings}) {
 const ref=useRef<HTMLCanvasElement>(null),scene=findPanel(project,panel.id)!.scene;
 useEffect(()=>{
  let active=true;
  const canvas=ref.current!;canvas.width=Math.min(project.width,1920);canvas.height=Math.max(1,Math.round(canvas.width*project.height/project.width));
  const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,canvas.width,canvas.height);
  const skins=onionPanels(scene,panel.id,settings);
  Promise.all(skins.map(s=>preloadImages(s.panel))).then(()=>{
   if(!active)return;
   const scratch=document.createElement('canvas');
   for(const skin of skins){
    drawPanel(scratch,skin.panel,project,{width:canvas.width,transparent:true});
    const sc=scratch.getContext('2d')!,pixels=sc.getImageData(0,0,scratch.width,scratch.height),rgb=skin.direction==='backward'?[239,72,83]:[35,193,86];
    // White paper in flattened/imported images must not hide other ghosts.
    for(let i=0;i<pixels.data.length;i+=4){const darkness=1-(pixels.data[i]*.2126+pixels.data[i+1]*.7152+pixels.data[i+2]*.0722)/255;pixels.data[i+3]=Math.round(pixels.data[i+3]*darkness);pixels.data[i]=rgb[0];pixels.data[i+1]=rgb[1];pixels.data[i+2]=rgb[2];}
    sc.putImageData(pixels,0,0);ctx.globalAlpha=.55/skin.distance;ctx.drawImage(scratch,0,0);
   }
   ctx.globalAlpha=1;
  }).catch(()=>{if(active)ctx.clearRect(0,0,canvas.width,canvas.height);});
  return()=>{active=false;};
 },[scene,panel.id,project.width,project.height,settings]);
 return <canvas ref={ref} className="onion-skin-surface" aria-hidden="true"/>;
}
