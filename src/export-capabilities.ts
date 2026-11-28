import {projectFrames,type Project} from './model.ts';
/** Capabilities declared by the current production export pipelines, not by filename alone. */
export const exportFormats = Object.freeze([
  {extension:'webm',name:'WebM',available:true,detail:'Chromium MediaRecorder; VP8/VP9 and Opus when supported'},
  {extension:'mp4',name:'MP4',available:false,detail:'Requires a validated H.264/AAC encoder and MP4 muxer'},
  {extension:'mov',name:'MOV',available:false,detail:'Requires a validated QuickTime-compatible video/audio encoder and MOV muxer'}
] as const);
export const EXPORT_LONGEST_EDGE = 1920;
export const DESKTOP_ENCODED_OUTPUT_MAX_BYTES = 512*1024*1024;
export function exportProfile(project:Pick<Project,'width'|'height'|'fps'|'scenes'>) {
 const frames=projectFrames(project as Project);
 const scale=Math.min(1,EXPORT_LONGEST_EDGE/Math.max(project.width,project.height));
 return {
  frames,
  seconds:frames/project.fps,
  outputWidth:Math.max(1,Math.floor(project.width*scale)),
  outputHeight:Math.max(1,Math.floor(project.height*scale)),
  fps:project.fps,
  browserFormat:'webm' as const,
  browserRealtime:true,
  desktopEncodedMaxBytes:DESKTOP_ENCODED_OUTPUT_MAX_BYTES
 };
}

export type ExportFormat='webm'|'mp4'|'mov';
export type ExportCapabilities=Record<ExportFormat,boolean>;
export function extendedExportProfile(project:Pick<Project,'width'|'height'|'fps'|'scenes'>){
 const profile=exportProfile(project);
 const scale=Math.min(1,EXPORT_LONGEST_EDGE/Math.max(project.width,project.height));
 const outputWidth=Math.floor(project.width*scale/2)*2,outputHeight=Math.floor(project.height*scale/2)*2;
 return {...profile,outputWidth,outputHeight,eligible:outputWidth>=2&&outputHeight>=2&&profile.frames>=1&&profile.frames<=100000&&profile.seconds<=600};
}
