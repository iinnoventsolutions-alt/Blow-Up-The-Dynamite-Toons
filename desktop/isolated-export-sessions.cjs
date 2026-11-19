/** N3.17-B isolated session coordinator; no production IPC registration. */
const {randomUUID}=require('node:crypto');
const {validateExportRequest}=require('./isolated-export-ipc-contract.cjs');
function createIsolatedExportSessions({startExport,createId=randomUUID}={}){
 if(typeof startExport!=='function')throw new TypeError('startExport required');
 const sessions=new Map();
 function ownerKey(owner){if(!owner||typeof owner!=='object')throw new TypeError('Trusted owner required');return owner}
 function start(owner,request){
  ownerKey(owner);
  const input=validateExportRequest(request);
  const id=createId();
  if(typeof id!=='string'||!id||sessions.has(id))throw new Error('Invalid or duplicate session ID');
  const controller=new AbortController();
  const session={id,owner,controller,status:'running',progress:0};
  sessions.set(id,session);
  const report=(value)=>{
   if(session.status!=='running')return;
   if(!Number.isFinite(value)||value<session.progress||value>1)throw new RangeError('Invalid progress');
   session.progress=value;
  };
  session.done=Promise.resolve().then(()=>startExport(input,{signal:controller.signal,report,id}))
   .then(value=>{session.status=controller.signal.aborted?'cancelled':'completed';return value},
         error=>{session.status=controller.signal.aborted?'cancelled':'failed';throw error})
   .finally(()=>{sessions.delete(id)});
  session.done.catch(()=>{});
  return {id,done:session.done};
 }
 function get(owner,id){
  ownerKey(owner);
  const session=sessions.get(id);
  if(!session||session.owner!==owner)throw new Error('Unknown or unauthorized export session');
  return session;
 }
 function progress(owner,id){const s=get(owner,id);return Object.freeze({status:s.status,progress:s.progress})}
 function cancel(owner,id){const s=get(owner,id);if(!s.controller.signal.aborted)s.controller.abort();return true}
 async function closeOwner(owner){
  ownerKey(owner);
  const owned=[...sessions.values()].filter(s=>s.owner===owner);
  for(const s of owned)s.controller.abort();
  await Promise.allSettled(owned.map(s=>s.done));
 }
 return Object.freeze({start,progress,cancel,closeOwner,activeCount:()=>sessions.size});
}
module.exports={createIsolatedExportSessions};
