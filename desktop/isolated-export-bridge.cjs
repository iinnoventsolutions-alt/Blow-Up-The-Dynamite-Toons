/** N3.17-C isolated Electron-facing adapter. NOT registered with ipcMain. */
const {assertTrustedSender}=require('./ipc-security.cjs');
function createIsolatedExportBridge({sessions,window,pageURL,windowIsUsable}={}){
 if(!sessions||typeof sessions.start!=='function'||typeof sessions.cancel!=='function'||typeof sessions.progress!=='function'||typeof sessions.closeOwner!=='function')throw new TypeError('Invalid sessions');
 if(typeof pageURL!=='string'||!pageURL||typeof windowIsUsable!=='function')throw new TypeError('Invalid trusted window configuration');
 function trusted(event){assertTrustedSender(event,window,pageURL,windowIsUsable);return event.sender}
 function sessionId(value){if(typeof value!=='string'||!/^[a-zA-Z0-9-]{1,128}$/.test(value))throw new TypeError('Invalid session ID');return value}
 return Object.freeze({
  start(event,request){return sessions.start(trusted(event),request)},
  progress(event,id){return sessions.progress(trusted(event),sessionId(id))},
  cancel(event,id){return sessions.cancel(trusted(event),sessionId(id))},
  closeWindow(){return sessions.closeOwner(window.webContents)}
 });
}
module.exports={createIsolatedExportBridge};
