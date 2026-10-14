import { allPanels, panelStart, uid, type Project, type Transition } from './model.ts';
export const transitionNames = { dissolve:'Dissolve', 'edge-wipe':'Edge Wipe', 'clock-wipe':'Clock Wipe', slide:'Slide' };
export function addTransition(project: Project, fromId: string): Transition {
 const entries=allPanels(project),index=entries.findIndex(e=>e.panel.id===fromId),from=entries[index]?.panel,to=entries[index+1]?.panel;
 if(!from||!to)throw new Error('Select a panel with a following panel to add a transition.');
 if(from.duration<2)throw new Error('The outgoing panel needs at least two frames for a transition.');
 const existing=project.transitions.find(t=>t.fromId===fromId);if(existing)return existing;
 const t:Transition={id:uid(),fromId,toId:to.id,type:'dissolve',duration:Math.min(project.fps,from.duration),direction:'right'};project.transitions.push(t);return t;
}
export function transitionAt(project:Project,frame:number){
 for(const transition of project.transitions){const boundary=panelStart(project,transition.toId),start=boundary-transition.duration;if(frame>=start&&frame<boundary)return {transition,start,boundary,progress:(frame-start)/(transition.duration-1)};}
 return undefined;
}
