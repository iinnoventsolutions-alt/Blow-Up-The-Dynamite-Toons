import { cameraAt, type Project } from './model.ts';
import { resetPanelCamera, putCameraKey } from './camera.ts';
import {
  defaultCamera, deleteSequentialIntermediateKey, setSequentialCameraOut,
  setSequentialFirstPanelIn, setSequentialIntermediateKey, setSequentialStaticCamera,
  resolveCompatibleCamera, type CameraPose
} from './sequential-camera.ts';

export type CameraResetScope = 'key' | 'panel' | 'scene';
export type CameraKeyTarget = 'in' | 'out' | 'intermediate' | null;

/** Immutable, single-history-step camera reset. No migration between legacy and sequential engines. */
export function resetCameraScope(
  project: Project, sceneId: string, panelId: string, scope: CameraResetScope,
  selected: CameraKeyTarget = null, sceneFrame = 0
): Project {
  const scene = project.scenes.find(s => s.id === sceneId);
  const panel = scene?.panels.find(p => p.id === panelId);
  if (!scene || !panel) throw new Error('Camera reset target no longer exists.');
  const neutral = defaultCamera(project);
  if (!scene.sequentialCamera) {
    const next = structuredClone(project);
    const targetScene = next.scenes.find(s => s.id === sceneId)!;
    const targetPanel = targetScene.panels.find(p => p.id === panelId)!;
    if (scope === 'scene') {
      targetScene.camera = [];
      for (const p of targetScene.panels) delete p.staticCamera;
    } else if (scope === 'panel') {
      resetPanelCamera(targetScene, targetPanel, next);
    } else {
      const key = targetScene.camera.find(k => k.frame === sceneFrame);
      if (!key) throw new Error('Select an existing keyframe to reset.');
      Object.assign(key, neutral);
    }
    return next;
  }
  if (scope === 'scene') {
    const next = structuredClone(project);
    const target = next.scenes.find(s => s.id === sceneId)!;
    target.sequentialCamera = {version: 1, baseline: neutral, panels: {}};
    return next;
  }
  if (scope === 'panel') {
    const next = structuredClone(project);
    const target = next.scenes.find(s => s.id === sceneId)!;
    const camera = target.sequentialCamera!;
    if (target.panels[0]?.id === panelId) {
      camera.baseline = neutral;
      delete camera.panels[panelId];
    } else {
      camera.panels[panelId] = {mode: 'break', pose: neutral};
    }
    // Check every downstream inherited pose before committing.
    for (const p of target.panels) resolveCompatibleCamera(next, sceneId, p.id, p.duration - 1);
    return next;
  }
  if (selected === 'in') {
    if (scene.panels[0].id !== panelId) throw new Error('Inherited IN is locked.');
    return setSequentialFirstPanelIn(project, sceneId, panelId, neutral);
  }
  if (selected === 'intermediate') {
    const start = scene.panels.slice(0, scene.panels.indexOf(panel)).reduce((n, p) => n + p.duration, 0);
    return setSequentialIntermediateKey(project, sceneId, panelId, sceneFrame - start, neutral);
  }
  if (selected === 'out') {
    const state = scene.sequentialCamera.panels[panelId];
    if (state?.mode !== 'animated') throw new Error('Select an animated OUT keyframe.');
    return setSequentialCameraOut(project, sceneId, panelId, neutral);
  }
  const state = scene.sequentialCamera.panels[panelId];
  if (state?.mode === 'static' || state?.mode === 'break') {
    return setSequentialStaticCamera(project, sceneId, panelId, neutral);
  }
  throw new Error('Select an editable camera keyframe to reset.');
}

/** Delete a real key; never treat locked/inherited IN as a deletable keyframe. */
export function deleteCameraKeyframe(
  project: Project, sceneId: string, panelId: string,
  selected: CameraKeyTarget, sceneFrame: number
): Project {
  const scene = project.scenes.find(s => s.id === sceneId);
  const panel = scene?.panels.find(p => p.id === panelId);
  if (!scene || !panel) throw new Error('Camera keyframe target no longer exists.');
  if (!scene.sequentialCamera) {
    const key = scene.camera.find(k => k.frame === sceneFrame);
    if (!key) throw new Error('Select an existing keyframe to delete.');
    const next = structuredClone(project);
    const target = next.scenes.find(s => s.id === sceneId)!;
    target.camera = target.camera.filter(k => k.id !== key.id);
    return next;
  }
  if (selected === 'in') throw new Error('IN is the camera inheritance boundary and cannot be deleted. Use Reset IN instead.');
  if (selected === 'intermediate') {
    const start = scene.panels.slice(0, scene.panels.indexOf(panel)).reduce((n, p) => n + p.duration, 0);
    return deleteSequentialIntermediateKey(project, sceneId, panelId, sceneFrame - start);
  }
  if (selected === 'out') {
    const state = scene.sequentialCamera.panels[panelId];
    if (state?.mode !== 'animated') throw new Error('Animated OUT keyframe not found.');
    const outFrame = panel.duration - 1;
    if (!state.keys.some(k => k.frame === outFrame)) throw new Error('Explicit OUT keyframe not found.');
    const remaining = state.keys.filter(k => k.frame !== outFrame);
    const next = structuredClone(project);
    const camera = next.scenes.find(s => s.id === sceneId)!.sequentialCamera!;
    camera.panels[panelId] = remaining.length
      ? {mode: 'animated', ...(state.inPose ? {inPose: structuredClone(state.inPose)} : {}), keys: remaining}
      : {mode: 'inherit'};
    for (const p of next.scenes.find(s => s.id === sceneId)!.panels) {
      resolveCompatibleCamera(next, sceneId, p.id, p.duration - 1);
    }
    return next;
  }
  throw new Error('Select an intermediate or OUT keyframe to delete.');
}

/** Read-only pose, exposed to keep reset previews consistent with camera evaluator. */
export function cameraPoseAt(project: Project, sceneId: string, panelId: string, sceneFrame: number): CameraPose {
  const scene = project.scenes.find(s => s.id === sceneId);
  if (!scene) throw new Error('Scene not found.');
  if (!scene.sequentialCamera) return cameraAt(scene, sceneFrame, project);
  const index = scene.panels.findIndex(p => p.id === panelId);
  if (index === -1) throw new Error('Panel not found.');
  const start = scene.panels.slice(0, index).reduce((n, p) => n + p.duration, 0);
  return resolveCompatibleCamera(project, sceneId, panelId, sceneFrame - start).pose;
}
