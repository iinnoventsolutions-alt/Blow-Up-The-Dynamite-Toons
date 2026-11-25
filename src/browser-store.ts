// Portable media projects outgrow localStorage's small string quota.
// Read legacy records lazily; new browser records use IndexedDB.
type Recent={id:string;name:string;text:string};
let opening:Promise<IDBDatabase>|undefined;
function db(){return opening ||= new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('innovent-project-storage',1);request.onupgradeneeded=()=>request.result.createObjectStore('records');request.onsuccess=()=>resolve(request.result);request.onerror=()=>{opening=undefined;reject(new Error('Browser project storage is unavailable. Save a project file.'));};});}
async function read<T>(key:string):Promise<T|undefined>{const database=await db();return new Promise((resolve,reject)=>{const request=database.transaction('records','readonly').objectStore('records').get(key);request.onsuccess=()=>resolve(request.result as T|undefined);request.onerror=()=>reject(request.error);});}
async function write(key:string,value:unknown,remove=false){const database=await db();await new Promise<void>((resolve,reject)=>{const transaction=database.transaction('records','readwrite');if(remove)transaction.objectStore('records').delete(key);else transaction.objectStore('records').put(value,key);transaction.oncomplete=()=>resolve();transaction.onerror=transaction.onabort=()=>reject(new Error('Browser project storage is full or unavailable. Save a project file.'));});}
async function hiddenRecentIds():Promise<string[]>{
 try{return (await read<string[]>('hiddenRecentIds'))??[];}catch{return [];}
}
export async function browserRecent():Promise<Recent[]>{
 let records:Recent[]|undefined;
 try{records=await read<Recent[]>('recent');}catch{}
 const hidden=new Set(await hiddenRecentIds());
 return (records??(JSON.parse(localStorage.getItem('innovent.recent')||'[]') as Recent[])).filter((r:Recent)=>!hidden.has(r.id));
}
// Hide recent references without deleting cached project data or downloaded project files.
export async function clearBrowserRecent():Promise<void>{
 const records=await browserRecent();
 const hidden=new Set(await hiddenRecentIds());
 records.forEach(record=>hidden.add(record.id));
 await write('hiddenRecentIds',[...hidden]);
}

export async function rememberBrowserProject(record:Recent){
 const list=await browserRecent();
 await write('recent',[record,...list.filter(r=>r.id!==record.id)].slice(0,3));
 const hidden=new Set(await hiddenRecentIds());
 if(hidden.delete(record.id))await write('hiddenRecentIds',[...hidden]);
 localStorage.removeItem('innovent.recent');
}
export async function browserRecovery():Promise<string|null>{let text:string|undefined;try{text=await read<string>('recovery');}catch{}return text??localStorage.getItem('innovent.recovery');}
export async function snapshotBrowserProject(text:string){await write('recovery',text);localStorage.removeItem('innovent.recovery');}
export async function clearBrowserRecovery(){await write('recovery',undefined,true);localStorage.removeItem('innovent.recovery');}
