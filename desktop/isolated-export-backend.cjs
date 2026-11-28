/** N3.17-I trusted backend composition. Not activated by production main.cjs. */
const {validateExportRequest}=require('./isolated-export-ipc-contract.cjs');
const {createIsolatedExportPipeline}=require('./isolated-export-pipeline.cjs');
function createTrustedExportBackend({resourcesPath,resolveProject,renderFrame,renderAudio,sinkFactory,formatPolicy,createStereoTransport}={}){
 if(typeof resolveProject!=='function'||typeof renderFrame!=='function'||typeof renderAudio!=='function')throw new TypeError('Trusted backend dependencies required');
 return async function startExport(untrusted,{signal,report}){
  const request=formatPolicy?formatPolicy.validate(untrusted):validateExportRequest(untrusted);
  signal.throwIfAborted();
  // Project IDs are selectors, never filesystem paths or renderer-provided project data.
  const project=await resolveProject(request.projectId,signal);
  signal.throwIfAborted();
  if(!project||typeof project!=='object'||project.id!==request.projectId||!Number.isSafeInteger(project.frameCount)||project.frameCount<1||project.frameCount>100000)throw new Error('Trusted project unavailable');
  if(project.width!==request.width||project.height!==request.height||project.fps!==request.fps)throw new Error('Project export settings mismatch');
  if(request.format==='mp4'||request.format==='mov'){
   if(typeof createStereoTransport!=='function')throw new Error('Stereo transport unavailable');
   if(request.width%2||request.height%2||Math.max(request.width,request.height)>1920)throw new RangeError('Invalid MP4/MOV export geometry');
   if(Math.round(project.frameCount/request.fps*48000)>28800000)throw new RangeError('MP4/MOV duration exceeds stereo limit');
  }
  const pipeline=createIsolatedExportPipeline({
   resourcesPath,frameCount:project.frameCount,
   renderFrame:(_,index,s)=>renderFrame(project,index,s),
   renderAudio:(_,s)=>renderAudio(project,s),
   ...(createStereoTransport?{createStereoTransport:(_,s)=>createStereoTransport(project,s)}:{}),
   ...(sinkFactory?{sinkFactory}:{})
  });
  return pipeline(request,{signal,report});
 };
}
module.exports={createTrustedExportBackend};
