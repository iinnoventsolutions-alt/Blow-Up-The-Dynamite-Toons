/** N3.17-I trusted backend composition. Not activated by production main.cjs. */
const {validateExportRequest}=require('./isolated-export-ipc-contract.cjs');
const {createIsolatedExportPipeline}=require('./isolated-export-pipeline.cjs');
function createTrustedExportBackend({resourcesPath,resolveProject,renderFrame,renderAudio,sinkFactory}={}){
 if(typeof resolveProject!=='function'||typeof renderFrame!=='function'||typeof renderAudio!=='function')throw new TypeError('Trusted backend dependencies required');
 return async function startExport(untrusted,{signal,report}){
  const request=validateExportRequest(untrusted);
  signal.throwIfAborted();
  // Project IDs are selectors, never filesystem paths or renderer-provided project data.
  const project=await resolveProject(request.projectId,signal);
  signal.throwIfAborted();
  if(!project||typeof project!=='object'||project.id!==request.projectId||!Number.isSafeInteger(project.frameCount)||project.frameCount<1||project.frameCount>100000)throw new Error('Trusted project unavailable');
  if(project.width!==request.width||project.height!==request.height||project.fps!==request.fps)throw new Error('Project export settings mismatch');
  const pipeline=createIsolatedExportPipeline({
   resourcesPath,frameCount:project.frameCount,
   renderFrame:(_,index,s)=>renderFrame(project,index,s),
   renderAudio:(_,s)=>renderAudio(project,s),
   ...(sinkFactory?{sinkFactory}:{})
  });
  return pipeline(request,{signal,report});
 };
}
module.exports={createTrustedExportBackend};
