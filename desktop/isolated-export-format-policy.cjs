/** D6-B: trusted desktop capability policy. No production activation. */
const {probeMp4Mov}=require('./mp4-mov-runtime.cjs');
const {validateExportRequest}=require('./isolated-export-ipc-contract.cjs');
async function createExportFormatPolicy({resourcesPath,enableMp4Mov=false,signal,probe=probeMp4Mov}={}){
 signal?.throwIfAborted();
 let available=false;
 if(enableMp4Mov===true){
  try{
   const result=await probe(resourcesPath,{signal});
   signal?.throwIfAborted();
   available=result?.version==='7.1.5'&&Array.isArray(result.formats)&&result.formats.includes('mp4')&&result.formats.includes('mov');
  }catch(error){signal?.throwIfAborted();}
 }
 const capabilities=Object.freeze({webm:true,mp4:available,mov:available});
 return Object.freeze({capabilities,validate(input){
  return validateExportRequest(input,{allowMp4Mov:available});
 }});
}
module.exports={createExportFormatPolicy};
