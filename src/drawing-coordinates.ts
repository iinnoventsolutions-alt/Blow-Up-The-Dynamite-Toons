// Derive coordinates from the painted canvas, not an SVG screen matrix that
// may disagree with a CSS-transformed viewport on different browser engines.
export function drawingPoint(x:number,y:number,rect:{left:number;top:number;width:number;height:number},aspect:number,rotation:number,width:number,height:number){
 const angle=rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),displayWidth=rect.width/(Math.abs(c)+Math.abs(s)/aspect),displayHeight=displayWidth/aspect;
 const dx=x-rect.left-rect.width/2,dy=y-rect.top-rect.height/2;
 return {x:width/2+(dx*c+dy*s)*width/displayWidth,y:height/2+(-dx*s+dy*c)*height/displayHeight};
}
