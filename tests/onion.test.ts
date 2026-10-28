import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, makePanel, makeScene } from '../src/model.ts';
import { onionPanels, skinCount } from '../src/onion.ts';
test('onion counts independently select up to five neighbors inside one scene',()=>{
 const p=makeProject(),s=p.scenes[0];s.panels=Array.from({length:11},(_,i)=>makePanel(`Panel ${i}`));p.scenes.push(makeScene('Other'));
 const id=s.panels[5].id;
 for(let back=0;back<=5;back++)for(let forward=0;forward<=5;forward++){const skins=onionPanels(s,id,{enabled:true,backward:back,forward});assert.equal(skins.length,back+forward);assert(skins.every(x=>x.panel.id!==id&&s.panels.includes(x.panel)));assert.equal(skins.filter(x=>x.direction==='backward').length,back);}
 assert.equal(onionPanels(s,s.panels[0].id,{enabled:true,backward:5,forward:5}).length,5);
 assert.equal(onionPanels(s,s.panels[10].id,{enabled:true,backward:5,forward:5}).length,5);
 assert.equal(onionPanels(p.scenes[1],p.scenes[1].panels[0].id,{enabled:true,backward:5,forward:5}).length,0);
 assert.equal(onionPanels(s,id,{enabled:false,backward:5,forward:5}).length,0);
 assert.equal(onionPanels(s,'missing',{enabled:true,backward:5,forward:5}).length,0);
 assert.equal(skinCount(6),5);assert.equal(skinCount(10),5);assert.equal(skinCount(99),5);assert.equal(skinCount(-1),0);assert.equal(skinCount(NaN),1);
});
