/** N3.17-A: isolated metadata validator; not wired to production Electron IPC. */
function validateExportRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Invalid export request');
 const keys=Object.keys(input),allowed=['projectId','width','height','fps','outputName'];
 if(keys.some(k=>!allowed.includes(k))||keys.length!==allowed.length)throw new TypeError('Unexpected export request fields');
 const {projectId,width,height,fps,outputName}=input;
 if(typeof projectId!=='string'||!/^[-_a-zA-Z0-9]{1,80}$/.test(projectId))throw new TypeError('Invalid project ID');
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<2||height<2||width>4096||height>4096||width*height*4>64*1024*1024)throw new RangeError('Invalid dimensions');
 if(!Number.isFinite(fps)||fps<1||fps>120)throw new RangeError('Invalid fps');
 if(typeof outputName!=='string'||outputName.length<1||outputName.length>100||! /^[a-zA-Z0-9][a-zA-Z0-9 _.-]*\.webm$/.test(outputName)||outputName.includes('..'))throw new TypeError('Invalid output name');
 return Object.freeze({projectId,width,height,fps,outputName});
}
module.exports={validateExportRequest};
