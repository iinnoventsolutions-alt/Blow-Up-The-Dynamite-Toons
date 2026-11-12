/** N3.17-J isolated, trusted live-project snapshot registry.
 * Snapshots must be supplied by the main-process project authority, never by
 * an arbitrary renderer IPC payload. No production registration or UI.
 */
const {validateExportRequest}=require('./isolated-export-ipc-contract.cjs');
function createTrustedProjectRegistry({inspectProject}={}){
 if(typeof inspectProject!=='function')throw new TypeError('Trusted project inspector required');
 const snapshots=new Map();
 function publish(project){
  const meta=inspectProject(project);
  if(!meta||typeof meta.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(meta.id)||
     !Number.isSafeInteger(meta.width)||!Number.isSafeInteger(meta.height)||
     !Number.isFinite(meta.fps)||!Number.isSafeInteger(meta.frameCount)||
     meta.frameCount<1||meta.frameCount>100000)throw new Error('Invalid trusted project metadata');
  const validated=validateExportRequest({projectId:meta.id,width:meta.width,height:meta.height,fps:meta.fps,outputName:'export.webm'});
  const snapshot=structuredClone(project);
  snapshots.set(validated.projectId,Object.freeze({id:validated.projectId,width:validated.width,height:validated.height,fps:validated.fps,frameCount:meta.frameCount,snapshot}));
  return validated.projectId;
 }
 async function resolveProject(id,signal){
  signal?.throwIfAborted();
  const entry=snapshots.get(id);
  if(!entry)return null;
  // Return a private copy; callers cannot mutate the authoritative snapshot.
  return {...entry,snapshot:structuredClone(entry.snapshot)};
 }
 function remove(id){return snapshots.delete(id)}
 function clear(){snapshots.clear()}
 return Object.freeze({publish,resolveProject,remove,clear,size:()=>snapshots.size});
}
module.exports={createTrustedProjectRegistry};
