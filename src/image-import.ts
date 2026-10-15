export async function readEmbeddedImage(file:File){
 if(file.size>8*1024*1024)throw new Error('Please use an image smaller than 8 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v),jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP';
 const mime=png?'image/png':jpeg?'image/jpeg':webp?'image/webp':'';
 if(!mime)throw new Error('This file is not a valid PNG, JPEG or WebP image.');
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const source='data:'+mime+';base64,'+btoa(binary),image=new Image();image.src=source;
 try{await image.decode();}catch{throw new Error('This image could not be decoded. No layer was added.');}
 if(image.width*image.height>16777216)throw new Error('Imported images support up to 16 megapixels. Resize this image first.');
 return source;
}
