import type { Tool } from './artwork';
const classicPaths:Record<Tool,string>={select:'M4 3l15 10-7 1-3 7z',brush:'M14 3l7 3-9 11-4-4z M8 13c-6 0-2 8-6 8 7 2 10-1 10-5',pencil:'M4 16L16 4l4 4L8 20H4z M13 7l4 4',contour:'M3 12C4 1 20 1 21 12S4 23 3 12 M3 10v4 M19 10v4 M10 3h4 M10 21h4','pencil-editor':'M3 18C6 2 18 22 21 5 M3 16v4 M10 10h4 M19 3v4',text:'M4 5h16 M12 5v16 M8 21h8',eraser:'M3 14l9-10 8 7-9 10H9z M8 9l8 7',bucket:'M5 4l13 11-8 6-8-8L12 2 M19 14c6 7 0 9 0 3',shape:'M3 3h13v13H3z M13 10a7 7 0 1 1-3 3',picker:'M5 17L17 5l3 3L8 20H4z M15 3l6 6',hand:'M6 11V6a1 1 0 0 1 2 0v5-7a1 1 0 0 1 2 0v7-8a1 1 0 0 1 2 0v8-6a1 1 0 0 1 2 0v8l3-3 2 1-4 9H9l-5-8z',zoom:'M10 3a7 7 0 1 0 0 14a7 7 0 0 0 0-14 M15 15l7 7 M7 10h6 M10 7v6',camera:'M3 6h12v13H3z M15 10l6-4v13l-6-4','select-color':'M4 3l14 9-7 2-3 7z M20 3v5 M17 6h6','rotate-view':'M4 9a8 8 0 1 1 0 7 M4 3v6h6'};
export type IconStyle = 'classic' | 'updated';
type IconName = Tool | 'import-image' | 'export-image' | 'palette';
// Original paths remain untouched for immediate visual rollback.
const updated:Record<IconName,{body:string;detail:string}>={
 select:{body:'M5 3v17l4-4 3 6 3-1-3-6h7Z',detail:'M5 3v17l4-4 3 6 3-1-3-6h7Z'},
 brush:{body:'M16 2c1-1 4 1 3 3l-7 10-4-3Z M8 12c-5 0-2 7-6 8 5 3 11 0 10-5Z',detail:'M16 2c1-1 4 1 3 3l-7 10-4-3Z M8 12c-5 0-2 7-6 8 5 3 11 0 10-5Z M9 11l4 3 M5 19c3 0 4-2 4-3'},
 pencil:{body:'M5 15 15 3c1-1 2-1 3 0l2 2c1 1 1 2 0 3L9 20l-6 1Z',detail:'M5 15 15 3c1-1 2-1 3 0l2 2c1 1 1 2 0 3L9 20l-6 1Z M5 15l4 5 M13 6l5 5 M3 21l2-1 M8 16l8-9'},
 contour:{body:'M5 7c2-5 12-5 14 1 3 8-3 13-9 11C3 18 2 12 5 7Z',detail:'M5 7c2-5 12-5 14 1 3 8-3 13-9 11C3 18 2 12 5 7Z M3 5h4v4H3Z M17 6h4v4h-4Z M8 17h4v4H8Z'},
 'pencil-editor':{body:'M2 16h4v4H2Z M10 9h4v4h-4Z M18 2h4v4h-4Z',detail:'M4 18C7 3 16 22 20 4 M2 16h4v4H2Z M10 9h4v4h-4Z M18 2h4v4h-4Z'},
 text:{body:'M4 4h13v3h-5v14H9V7H4Z',detail:'M4 4h13v3h-5v14H9V7H4Z M21 9v12 M19 9h4 M19 21h4'},
 eraser:{body:'m3 14 8-10c1-1 2-1 3 0l7 6-8 10H9Z',detail:'m3 14 8-10c1-1 2-1 3 0l7 6-8 10H9Z M7 9l10 8 M3 22h18'},
 bucket:{body:'M4 8l8-6 9 10-8 7-10-9Z M20 15c-4 5-2 7 0 7s4-2 0-7Z',detail:'M4 8l8-6 9 10-8 7-10-9Z M3 10h15 M8 6V3 M20 15c-4 5-2 7 0 7s4-2 0-7Z'},
 shape:{body:'M2 3h11v11H2Z M16 11a6 6 0 1 1-6 6 6 6 0 0 1 6-6Z',detail:'M2 3h11v11H2Z M16 11a6 6 0 1 1-6 6 6 6 0 0 1 6-6Z M16 2l6 6'},
 picker:{body:'m5 15 10-10 4 4L9 19l-6 2Z M15 3l6 6 2-2-6-6Z',detail:'m5 15 10-10 4 4L9 19l-6 2Z M15 3l6 6 2-2-6-6Z M6 14l4 4 M3 21l2-1'},
 hand:{body:'M6 12V7c0-2 3-2 3 0V4c0-2 3-2 3 0v1c0-2 3-2 3 0v2c0-2 3-2 3 0v6l2-2c2-1 3 1 2 2l-5 8H9l-6-7c-1-2 1-3 3-2Z',detail:'M6 12V7c0-2 3-2 3 0V4c0-2 3-2 3 0v1c0-2 3-2 3 0v2c0-2 3-2 3 0v6l2-2c2-1 3 1 2 2l-5 8H9l-6-7c-1-2 1-3 3-2Z M9 7v6 M12 5v8 M15 7v6'},
 'rotate-view':{body:'M3 3v6h6 M21 21v-6h-6',detail:'M4 9a8 8 0 0 1 14-3 M3 3v6h6 M20 15a8 8 0 0 1-14 3 M21 21v-6h-6 M9 9h6v6H9Z'},
 zoom:{body:'M10 3a7 7 0 1 0 0 14a7 7 0 0 0 0-14Z',detail:'M10 3a7 7 0 1 0 0 14a7 7 0 0 0 0-14 M15 15l7 7 M7 10h6 M10 7v6'},
 camera:{body:'M2 7h12v13H2Z M14 11l8-4v13l-8-4Z',detail:'M2 7h12v13H2Z M14 11l8-4v13l-8-4Z M4 3a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M9 3a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M5 11h6'},
 'select-color':{body:'M3 3v15l4-4 3 6 3-1-3-6h7Z M19 2c-4 5-3 8 0 8s4-3 0-8Z',detail:'M3 3v15l4-4 3 6 3-1-3-6h7Z M19 2c-4 5-3 8 0 8s4-3 0-8Z'},
 'import-image':{body:'M2 4h15v16H2Z',detail:'M2 4h15v16H2Z M4 17l4-5 3 3 3-2 M5 8h2 M22 11H12 M15 8l-3 3 3 3'},
 'export-image':{body:'M2 4h15v16H2Z',detail:'M2 4h15v16H2Z M4 17l4-5 3 3 3-2 M5 8h2 M12 11h10 M19 8l3 3-3 3'},
 palette:{body:'M12 2C1 2-2 17 7 21c5 2 4-3 6-4 2-1 9 3 9-4 0-7-4-11-10-11Z',detail:'M12 2C1 2-2 17 7 21c5 2 4-3 6-4 2-1 9 3 9-4 0-7-4-11-10-11Z M6 9h.1 M10 6h.1 M15 6h.1 M18 10h.1'}
};
export default function ToolIcon({tool,style='classic'}:{tool:IconName;style?:IconStyle}){
 if(style==='classic'&&tool==='palette')return null;
 if(style==='classic'&&(tool==='import-image'||tool==='export-image'))return <span aria-hidden="true" data-icon-style="classic">{tool==='import-image'?'⊞':'⇩'}</span>;
 return <svg className="tool-icon" data-icon-style={style} data-tool-icon={tool} viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={style==='classic'?'1.7':'1.65'} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{style==='updated'?<><path d={updated[tool].body} fill="currentColor" fillOpacity=".22" stroke="none"/><path d={updated[tool].detail}/></>:<path d={classicPaths[tool as Tool]}/>}</svg>;
}
export const toolTitles:Record<Tool,string>={select:'Select (V)',brush:'brush (B)',pencil:'Pencil (P)',contour:'Contour Editor','pencil-editor':'Pencil Editor',text:'Text (T)',eraser:'eraser (E)',bucket:'Paint Bucket (F)',shape:'Shape (U)',picker:'Color Picker (I)',hand:'hand (H)',camera:'camera (C)','select-color':'Select by Color','rotate-view':'Rotate View (R)',zoom:'Zoom (Z)'};
