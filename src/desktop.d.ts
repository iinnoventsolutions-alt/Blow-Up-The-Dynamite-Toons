export {};
type Result<T> = { ok: true; value: T } | { ok: false; error: string };
declare global {
  interface Window {
    desktop?: {
      isolatedExport?: {
        onAvailability(callback:(enabled:boolean)=>void):()=>void;
        start(request:{projectId:string;width:number;height:number;fps:number;outputName:string}):Promise<{id:string}>;
        progress(id:string):Promise<unknown>;
        cancel(id:string):Promise<unknown>;
        onRequest(callback:(request:import('./isolated-electron-renderer').IsolatedBrowserRequest)=>void):()=>void;
        reply(message:import('./isolated-electron-renderer').IsolatedBrowserReply):void;
        onComplete(callback:(result:{id:string;status:'saved'|'cancelled'|'failed';error?:string})=>void):()=>void;
      };
      exportPdf(data: ArrayBuffer, name: string, openAfter: boolean): Promise<Result<{ name: string } | null>>;
      save(text: string, saveAs: boolean): Promise<Result<{ name: string } | null>>;
      open(): Promise<Result<{ text: string; name: string } | null>>;
      recent(): Promise<Result<{ id: string; name: string }[]>>;
      openRecent(id: string): Promise<Result<{ text: string; name: string }>>;
      newProject(): Promise<Result<void>>;
      snapshot(text: string): Promise<Result<void>>;
      recovery(): Promise<Result<{ title: string } | null>>;
      recover(): Promise<Result<{ text: string; name: string }>>;
      discardRecovery(): Promise<Result<void>>;
      setDirty(dirty: boolean): void;
      closeAfterSave(): void;
      cancelClose(): void;
      rendererReady(): void;
      onAction(callback: (action: string) => void): () => void;
    }
  }
}
