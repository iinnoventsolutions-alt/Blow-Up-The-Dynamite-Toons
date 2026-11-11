// D4.6.5M isolated Electron media compatibility fixture.
// No production window, IPC, or export logic is modified.
const {app,BrowserWindow}=require('electron');
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
app.whenReady().then(()=>{
 const win=new BrowserWindow({show:false,width:480,height:320,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.loadURL(process.env.RFDR_MEDIA_URL);
});
app.on('window-all-closed',()=>app.quit());
