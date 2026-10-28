import {useEffect,useRef,useState} from 'react';
import {PRODUCT_NAME,BUILD_LABEL} from './build-info';

type HelpTopic={category:string;title:string;body:string;steps:string[]};
const topics:HelpTopic[]=[
 {category:'Start',title:'Getting started',body:'Build your first storyboard from panels, drawings, and timing.',steps:['Create a new storyboard or open an existing ISSB project.','Select a panel and draw using the left toolbar.','Add panels and scenes to organize the sequence.','Adjust panel timing in Timeline and preview in Pitch.','Save the project as an ISSB file.']},
 {category:'Drawing',title:'Drawing tools and shortcuts',body:'V Select · B Brush · P Pencil · E Eraser · F Paint Bucket · T Text · H Hand/Pan · Z Zoom · R Rotate View · C Camera.',steps:['Choose a drawing tool on the left toolbar or use its keyboard shortcut.','Adjust tool properties before drawing on the canvas.','For Zoom, click to zoom in, Option/Alt-click to zoom out, or drag a rectangle.','Use Fit in the top toolbar to restore the canvas view.']},
 {category:'Drawing',title:'Panels, scenes, and layers',body:'Organize shots, metadata, and layered artwork.',steps:['Select a panel to edit its artwork, dialogue, action, notes, and duration.','Add or reorder panels and scenes as needed.','Use Layers to separate artwork and toggle visibility.','Lock layers you do not want to edit accidentally.']},
 {category:'Camera',title:'Camera keyframes',body:'Animate framing with camera position, zoom, and rotation.',steps:['Select a panel and open the Camera inspector.','Add a keyframe at the panel beginning, current frame, or panel end.','Move or resize the camera outline, or adjust its numeric controls.','Scrub the timeline to inspect interpolation between keys.','Green IN and red OUT mark endpoints; blue outlines mark intermediate keys; neutral CAMERA marks a stationary camera.']},
 {category:'Camera',title:'Copy, paste, and reset camera',body:'Reuse a camera move across panels of different durations.',steps:['Select the source panel and choose Copy Camera.','Select the destination panel.','Choose Paste & Fit Camera to adapt the motion to the destination duration.','Use Reset Panel Camera to restore the selected panel camera.','Use Undo or Redo to review changes.']},
 {category:'Playback',title:'Timeline and playback',body:'Control pacing, transitions, and motion previews.',steps:['Open Timeline and adjust panel durations.','Add transitions between panels when needed.','Scrub the playhead to review timing and camera motion.','Play the sequence in Timeline or switch to Pitch for a playback-focused preview.']},
 {category:'Audio',title:'Audio tracks and clips',body:'Synchronize voices, music, and sound effects with the storyboard.',steps:['Open Timeline and import an audio file.','Drag a clip to position it or edit its start and trim controls.','Adjust track volume, mute, or solo to review the mix.','Play the sequence to confirm synchronization before exporting.']},
 {category:'Files',title:'Saving and recovery',body:'Keep your storyboard editable and recover interrupted work.',steps:['Choose Save Project to write an ISSB file.','Reopen the ISSB file to continue editing.','Review recovery snapshot settings in Preferences.','When a recovery prompt is available, inspect it before restoring.']},
 {category:'Export',title:'PDF and image exports',body:'Prepare storyboard pages or panel imagery for sharing.',steps:['Open Export PDF and select a layout and export range.','Choose Artwork, Camera, or Movement for panel imagery.','Preview the PDF and adjust page settings if needed.','Export the PDF; use the panel image export when a PNG is needed.']},
 {category:'Export',title:'Animatic export',body:'Render a WebM preview with camera movement, transitions, and audio.',steps:['Review panel timing, camera keys, and audio in Timeline.','Choose Export Animatic to begin WebM recording.','Keep the application visible while recording finishes.','Save the exported video, or use Cancel Export to stop the operation.']}
];
const categories=['All','Start','Drawing','Camera','Playback','Audio','Files','Export'];
export default function HelpAbout({close}:{close:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState('All');
 const results=topics.filter(topic=>(category==='All'||topic.category===category)&&(topic.title+' '+topic.body+' '+topic.steps.join(' ')).toLowerCase().includes(query.trim().toLowerCase()));
 useEffect(()=>{const node=ref.current;node?.showModal();return()=>{if(node?.open)node.close();};},[]);
 return <dialog ref={ref} className="help-about" onClose={close} onCancel={e=>{e.preventDefault();close();}} aria-label="Help and About">
 <div className="dialog-head"><h2>Help Center & About</h2><button onClick={close} title="Close Help and About" aria-label="Close Help and About">×</button></div>
 <div className="help-identity"><img src="./innovent-icon.png" alt="IInnovent Professional Storyboard application icon"/><div><strong>{PRODUCT_NAME}</strong><span>{BUILD_LABEL}</span></div></div>
 <label htmlFor="help-search">Search help topics</label>
 <input id="help-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tools, camera, export…" style={{display:'block',width:'100%',margin:'8px 0 16px',padding:'9px'}}/>
 <nav aria-label="Help categories" style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{categories.map(name=><button key={name} type="button" aria-pressed={category===name} onClick={()=>setCategory(name)}>{name}</button>)}</nav>
 <div aria-live="polite" aria-label="Help search results" style={{maxHeight:'48vh',overflowY:'auto'}}>
 {results.length?results.map(topic=><section key={topic.title} style={{marginBottom:16}}><h3>{topic.title}</h3><p>{topic.body}</p><ol>{topic.steps.map((step,index)=><li key={index}>{step}</li>)}</ol></section>):<p>No matching help topics. Try a different search term.</p>}
 </div>
 <h3>About</h3><p>{PRODUCT_NAME} combines layered drawing, scene and panel management, camera animation, audio, and storyboard export. Help content is included with the application and works offline.</p>
 <div className="dialog-footer"><button className="primary" onClick={close}>Done</button></div>
 </dialog>;
}
