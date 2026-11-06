import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,makePanel} from '../src/model.ts';
import {enableSequentialCameraStorage,resolveCompatibleCamera} from '../src/sequential-camera.ts';
import {copySequentialPanelCamera,pasteSequentialPanelCamera} from '../src/sequential-camera-clipboard.ts';

// E2.3-F0 diagnostic reproduction. Deliberately excluded from the CI gate
// until camera paste semantics are approved and the defect is corrected.
test('E2.3-F0: animated camera paste reproduces source IN/intermediate/OUT absolute framing',()=>{
  let project=makeProject();
  const sceneId=project.scenes[0].id;
  project.scenes[0].panels.push(makePanel('Destination'));
  project=enableSequentialCameraStorage(project,sceneId);
  const scene=project.scenes[0];
  const [source,destination]=scene.panels;
  source.duration=11;
  destination.duration=11;
  scene.sequentialCamera!.baseline={x:360,y:260,zoom:1.25,rotation:10};
  scene.sequentialCamera!.panels[source.id]={
    mode:'animated',
    keys:[
      {frame:5,x:80,y:-30,zoom:1.4,rotation:15,interpolation:'linear'},
      {frame:10,x:160,y:-60,zoom:1.8,rotation:30,interpolation:'linear'}
    ]
  };
  // Destination inherits source OUT, not the source IN.
  const sourceFrames=[0,5,10].map(frame=>resolveCompatibleCamera(project,sceneId,source.id,frame).pose);
  const destinationBefore=resolveCompatibleCamera(project,sceneId,destination.id,0).pose;
  assert.notDeepEqual(destinationBefore,sourceFrames[0], 'Reproduction requires different inherited IN poses');
  const snapshot=structuredClone(project);
  const pasted=pasteSequentialPanelCamera(project,sceneId,destination.id,copySequentialPanelCamera(project,sceneId,source.id));
  assert.deepEqual(project,snapshot,'Paste must not mutate the original project');
  for(const frame of [0,5,10]){
    assert.deepEqual(resolveCompatibleCamera(pasted,sceneId,destination.id,frame).pose,sourceFrames[[0,5,10].indexOf(frame)],
      'Pasted camera framing differs at local frame '+frame);
  }
});
