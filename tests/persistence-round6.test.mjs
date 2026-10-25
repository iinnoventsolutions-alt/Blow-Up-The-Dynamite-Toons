import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,writeFile,truncate} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {atomicWrite,readProject}=require('../desktop/persistence.cjs');

test('desktop persistence replaces files atomically without leftover temp files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'iinnovent-recovery-'));
 try{
  const file=join(dir,'nested','project.issb');
  await atomicWrite(file,'first');
  assert.equal(await readFile(file,'utf8'),'first');
  await atomicWrite(file,'second');
  assert.equal(await readFile(file,'utf8'),'second');
  assert.deepEqual(await readdir(join(dir,'nested')),['project.issb']);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('desktop project reader rejects invalid recovery/project data',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'iinnovent-invalid-'));
 try{
  const file=join(dir,'recovery.innovent');
  await writeFile(file,'{not valid json');
  await assert.rejects(readProject(file));
  await truncate(file,128*1024*1024+1);
  await assert.rejects(readProject(file),/128 MB limit/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
