import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {exportPdf}=createRequire(import.meta.url)('../desktop/pdf-export.cjs');
test('native PDF export preserves binary data, appends extension, opens only the chosen file, and handles cancellation',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'storyboard-pdf-'));const bytes=new Uint8Array([37,80,68,70,45,49,46,51,10,255,128,0]);let opened='',requested='';
 try{const deps={win:{},dialog:{showSaveDialog:async(_:unknown,options:{defaultPath:string})=>{requested=options.defaultPath;return {canceled:false,filePath:path.join(dir,'export')};}},shell:{openPath:async(p:string)=>{opened=p;return '';}}};
 assert.deepEqual(await exportPdf(bytes.buffer,'../Story.pdf',true,deps),{name:'export.pdf'});assert.equal(requested,'Story.pdf');assert.equal(opened,path.join(dir,'export.pdf'));assert.deepEqual(await readFile(opened),Buffer.from(bytes));
 opened='';await exportPdf(bytes.buffer,'Story.pdf',false,deps);assert.equal(opened,'');
 const canceled={...deps,dialog:{showSaveDialog:async()=>({canceled:true})}};assert.equal(await exportPdf(bytes.buffer,'x.pdf',true,canceled),null);assert.equal(opened,'');
 await assert.rejects(exportPdf(new Uint8Array([0]).buffer,'x.pdf',false,deps),/Invalid PDF/);
 await assert.rejects(exportPdf('not bytes','x.pdf',false,deps),/limit/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
