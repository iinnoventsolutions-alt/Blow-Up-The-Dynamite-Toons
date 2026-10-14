import type { Panel, Scene } from './model.ts';
export type OnionSettings = { enabled: boolean; backward: number; forward: number };
export const defaultOnion: OnionSettings = { enabled: false, backward: 1, forward: 1 };
export const skinCount = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(3, Math.trunc(n))) : 1;
export function onionPanels(scene: Scene, panelId: string, settings: OnionSettings): { panel: Panel; distance: number; direction: 'backward' | 'forward' }[] {
 const index=scene.panels.findIndex(p=>p.id===panelId);
 if(!settings.enabled||index<0)return [];
 const skins: ReturnType<typeof onionPanels> = [];
 for(const direction of ['backward','forward'] as const)for(let distance=skinCount(settings[direction]);distance>=1;distance--){const panel=scene.panels[index+(direction==='backward'?-distance:distance)];if(panel)skins.push({panel,distance,direction});}
 return skins;
}
