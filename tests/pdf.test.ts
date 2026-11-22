import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProject,makeScene,makePanel } from '../src/model.ts';
import { pdfEntries,pdfGeometry,normalizePdfSettings,pdfDefaults,type PdfRange } from '../src/pdf-settings.ts';
test('PDF ranges preserve project order, include selected panels and omit empty scenes',()=>{
 const p=makeProject();p.scenes[0].panels.push(makePanel());p.scenes.push(makeScene('Second'),{...makeScene('Empty'),panels:[]});const current=p.scenes[0].panels[1].id;
 const r:PdfRange={kind:'all',currentPanelId:current,panelIds:[p.scenes[1].panels[0].id,current],sceneIds:[p.scenes[1].id]};
 assert.equal(pdfEntries(p,r).length,3);
 assert.deepEqual(pdfEntries(p,{...r,kind:'selected'}).map(e=>e.panel.id),[current,p.scenes[1].panels[0].id]);
 assert.equal(pdfEntries(p,{...r,kind:'scene'}).length,2);assert.equal(pdfEntries(p,{...r,kind:'scenes'}).length,1);assert.equal(pdfEntries(p,{...r,kind:'panel'})[0].panel.id,current);
 assert.equal(pdfEntries(p,{...r,kind:'scenes',sceneIds:[p.scenes[2].id]}).length,0);
});
test('PDF profiles clamp malformed settings and reject remote branding sources',()=>{
 const s=normalizePdfSettings({margin:999,fontSize:-3,dpi:72 as 150,companyLogo:'https://example.com/logo.png',cover:'yes' as unknown as boolean});
 assert.equal(s.margin,54);assert.equal(s.fontSize,8);assert.equal(s.dpi,150);assert.equal(s.companyLogo,pdfDefaults.companyLogo);assert.equal(s.cover,true);
 for(const layout of ['vertical','horizontal','full','overview'] as const)for(const orientation of ['portrait','landscape'] as const){const g=pdfGeometry({...s,layout,orientation});assert(g.cw>0&&g.ch>0);assert(g.top+g.rows*g.ch+(g.rows-1)*g.gap<g.h-s.margin);}
});
