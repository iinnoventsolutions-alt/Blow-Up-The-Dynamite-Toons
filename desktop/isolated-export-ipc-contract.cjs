/** N3.17-A: isolated metadata validator; not wired to production Electron IPC. */
function validateExportRequest(input,{allowMp4Mov=false}={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Invalid export request');
 const keys=Object.keys(input),allowed=['projectId','width','height','fps','outputName'];
 if(keys.some(k=>!allowed.includes(k)&&k!=='format')||allowed.some(k=>!Object.hasOwn(input,k)))throw new TypeError('Unexpected export request fields');
 const {projectId,width,height,fps,outputName}=input;
 const explicit=Object.hasOwn(input,'format');
 const format=explicit?input.format:'webm';
 if(!['webm','mp4','mov'].includes(format))throw new TypeError('Invalid export format');
 if(format!=='webm'&&allowMp4Mov!==true)throw new TypeError('Export format unavailable');
 if(typeof projectId!=='string'||!/^[-_a-zA-Z0-9]{1,80}$/.test(projectId))throw new TypeError('Invalid project ID');
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<2||height<2||width>4096||height>4096||width*height*4>64*1024*1024)throw new RangeError('Invalid dimensions');
 if(!Number.isFinite(fps)||fps<1||fps>120)throw new RangeError('Invalid fps');
 if(typeof outputName!=='string'||outputName.length<1||outputName.length>100||! /^[a-zA-Z0-9][a-zA-Z0-9 _.-]*\.(webm|mp4|mov)$/.test(outputName)||!outputName.endsWith('.'+format)||outputName.includes('..'))throw new TypeError('Invalid output name');
 return Object.freeze({projectId,width,height,fps,outputName,...(explicit?{format}:{})});
}
module.exports={validateExportRequest};
