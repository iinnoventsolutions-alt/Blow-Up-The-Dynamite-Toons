// PT.1 deterministic schema-4 benchmark fixtures. Development-only, never bundled.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {makeProject,makePanel,makeLayer,makeScene} from '../src/model.ts';
import {serializeProject,parseProject} from '../src/project-format.js';
let state=0x1a2b3c4d, nextId=0;
const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
const id=()=> 'pt1_'+(++nextId);
const categories=['simple','moderate','complex','mixed'];
export function fixture(count=50){
 if(![1,10,25,50,100].includes(count))throw Error('Expected 1, 10, 25, 50 or 100 panels');
 state=0x1a2b3c4d;nextId=0;
 const project=makeProject('PT1 deterministic 50-panel benchmark',1920,1080,24);
 project.id=id();project.scenes=[];
 for(let n=0;n<count;n++){
  const sceneIndex=Math.floor(n/10);
  if(!project.scenes[sceneIndex]){const scene=makeScene('Scene '+(sceneIndex+1),24);scene.id=id();scene.panels=[];scene.camera=[];project.scenes.push(scene);}
  const scene=project.scenes[sceneIndex];
  const category=n%10<4?'simple':n%10<7?'moderate':n%10<9?'complex':'mixed';
  const config={simple:[2,16],moderate:[3,75],complex:[5,200],mixed:[4,90]}[category];
  const panel=makePanel('Panel '+(n+1),24);panel.id=id();panel.layers=[];
  panel.action='PT.1 '+category+' representative line artwork';panel.notes='Generated fixture; do not edit source data';
  for(let l=0;l<config[0];l++){
   const layer=makeLayer('Drawing '+(l+1));layer.id=id();layer.strokes=[];
   const strokes=Math.floor(config[1]/config[0]);
   for(let k=0;k<strokes;k++){
    const x=100+Math.floor(rand()*1450),y=80+Math.floor(rand()*700);
    const w=25+Math.floor(rand()*200),h=20+Math.floor(rand()*150);
    const points=k%4===0?[[x,y,1],[x+w,y,1],[x+w,y+h,1],[x,y+h,1],[x,y,1]]:[[x,y,1],[x+w,y+h,1]];
    layer.strokes.push({id:id(),tool:'pencil',color:'#182838',size:2+Math.floor(rand()*4),points});
   }
   panel.layers.push(layer);
  }
  scene.panels.push(panel);
 }
 // Deterministic camera keyframes on mixed-content scenes, with no export-side effects.
 for(const scene of project.scenes){if(scene.panels.length>=10){scene.camera=[{id:id(),frame:0,x:0,y:0,zoom:1,rotation:0,interpolation:'linear'},{id:id(),frame:scene.panels.length*120-1,x:80,y:30,zoom:1.08,rotation:0,interpolation:'linear'}];}}
 return parseProject(serializeProject(project));
}
if(process.argv[1]&&import.meta.url===new URL('file://'+resolve(process.argv[1])).href){
 const dir=resolve(process.argv[2]||'benchmark-results/fixtures');
 await mkdir(dir,{recursive:true});
 for(const n of [1,10,25,50]){const file=resolve(dir,'pt1-'+n+'-panels.issb');await writeFile(file,serializeProject(fixture(n)));console.log(file);}
}
