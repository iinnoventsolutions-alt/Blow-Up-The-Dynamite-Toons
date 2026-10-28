import {useEffect,useRef,useState} from 'react';
import {PRODUCT_NAME,BUILD_LABEL} from './build-info';

const topics=[
 {title:'Getting started',body:'Create or open a storyboard. Draw on a panel, organize scenes and panels, adjust timing in Timeline, preview motion in Pitch, and save the project as an ISSB file.'},
 {title:'Drawing tools and shortcuts',body:'V Select; B Brush; P Pencil; E Eraser; F Paint Bucket; T Text; H Hand/Pan; Z Zoom; R Rotate View; C Camera. Zoom by clicking, Option/Alt-clicking to zoom out, or dragging a zoom rectangle. Fit restores the view.'},
 {title:'Panels, scenes, and layers',body:'Organize shots into panels and scenes. Select a panel to edit its artwork, dialogue, action, notes, and duration. Use layers to separate artwork, control visibility, and protect content with locking.'},
 {title:'Camera keyframes',body:'Open the Camera inspector to add keyframes at the beginning, current frame, or end of a panel. Adjust camera position, zoom, and rotation. The neutral CAMERA outline marks a stationary camera; green IN and red OUT mark motion endpoints, and blue outlines mark intermediate keyframes.'},
 {title:'Copy, paste, and reset camera',body:'Copy camera movement from the selected panel, select another panel, then use Paste & Fit to adapt the movement to its duration. Reset Panel Camera restores the selected panel camera. Undo and Redo are available for camera edits.'},
 {title:'Timeline and playback',body:'Set panel durations and transitions in Timeline. Use the playhead and playback controls to review pacing. Pitch provides a playback-focused view of the storyboard, including animated camera moves.'},
 {title:'Audio',body:'Import audio clips to the timeline. Adjust clip start, trim, volume, mute, solo, and track placement. Listen during playback and include audio when exporting an animatic.'},
 {title:'Saving and recovery',body:'Save projects as ISSB files and reopen them to continue editing. The application supports recovery snapshots; review recovery options in Preferences.'},
 {title:'PDF and image exports',body:'Export storyboard PDFs using layouts, ranges, and image modes. Artwork mode shows the panel artwork; Camera mode uses the camera framing; Movement mode illustrates the camera path. PNG export is available for panel imagery.'},
 {title:'Animatic export',body:'Export an animatic as WebM video with camera movement, transitions, and audio. Keep the application visible until recording finishes. Use Cancel Export to stop an export in progress.'}
];
export default function HelpAbout({close}:{close:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 const [query,setQuery]=useState('');
 const results=topics.filter(topic=>(topic.title+' '+topic.body).toLowerCase().includes(query.trim().toLowerCase()));
 useEffect(()=>{const node=ref.current;node?.showModal();return()=>{if(node?.open)node.close();};},[]);
 return <dialog ref={ref} className="help-about" onClose={close} onCancel={e=>{e.preventDefault();close();}} aria-label="Help and About">
 <div className="dialog-head"><h2>Help Center & About</h2><button onClick={close} title="Close Help and About" aria-label="Close Help and About">×</button></div>
 <div className="help-identity"><img src="./innovent-icon.png" alt="IInnovent Professional Storyboard application icon"/><div><strong>{PRODUCT_NAME}</strong><span>{BUILD_LABEL}</span></div></div>
 <label htmlFor="help-search">Search help topics</label>
 <input id="help-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tools, camera, export…" style={{display:'block',width:'100%',margin:'8px 0 16px',padding:'9px'}}/>
 <div aria-live="polite" aria-label="Help search results" style={{maxHeight:'48vh',overflowY:'auto'}}>
 {results.length?results.map(topic=><section key={topic.title} style={{marginBottom:16}}><h3>{topic.title}</h3><p>{topic.body}</p></section>):<p>No matching help topics. Try a different search term.</p>}
 </div>
 <h3>About</h3><p>{PRODUCT_NAME} combines layered drawing, scene and panel management, camera animation, audio, and storyboard export. Help content is included with the application and works offline.</p>
 <div className="dialog-footer"><button className="primary" onClick={close}>Done</button></div>
 </dialog>;
}
