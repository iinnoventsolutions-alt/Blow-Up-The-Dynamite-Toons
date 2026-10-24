import {useEffect,useRef} from 'react';
import {PRODUCT_NAME,BUILD_LABEL} from './build-info';
export default function HelpAbout({close}:{close:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const node=ref.current;node?.showModal();return()=>{if(node?.open)node.close();};},[]);
 return <dialog ref={ref} className="help-about" onClose={close} onCancel={e=>{e.preventDefault();close();}} aria-label="Help and About">
 <div className="dialog-head"><h2>Help & About</h2><button onClick={close} title="Close Help and About">×</button></div>
 <div className="help-identity"><img src="./innovent-icon.png" alt="IInnovent Professional Storyboard application icon"/><div><strong>{PRODUCT_NAME}</strong><span>{BUILD_LABEL}</span></div></div>
 <h3>Getting started</h3><p>Create or open a storyboard, draw on a panel, organize panels in the Panel workspace, adjust timing in Timeline, and preview camera motion in Pitch. Save your project as an ISSB file.</p>
 <h3>Drawing shortcuts</h3><div className="help-shortcuts"><span>V — Select</span><span>B — Brush</span><span>P — Pencil</span><span>E — Eraser</span><span>F — Paint Bucket</span><span>T — Text</span><span>H — Hand / Pan</span><span>Z — Zoom</span><span>R — Rotate View</span><span>C — Camera</span></div>
 <p className="help-tip">Zoom: click to zoom in, Option/Alt-click to zoom out, or drag a rectangle to zoom into an area. Use Fit in the top toolbar to reset the view.</p>
 <h3>About</h3><p>IInnovent Professional Storyboard combines layered drawing, scene and panel management, camera animation, audio, and storyboard export. Application version and build are displayed above and in the status bar.</p>
 <div className="dialog-footer"><button className="primary" onClick={close}>Done</button></div>
 </dialog>;
}
