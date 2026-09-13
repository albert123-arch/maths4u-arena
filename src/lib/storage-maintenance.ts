import { stat } from "node:fs/promises";
import path from "node:path";
import { db } from "./prisma";
import { privateStorageRoot } from "./storage-config";
import { cleanDeletedFile } from "./files";
import { ensure } from "./errors";

// Examine only file keys recorded by Arena. Never traverse sibling directories.
export async function auditStorage() {
  const root = privateStorageRoot();
  const result = { originalQuotaBytes: 0, originalDiskBytes: 0, derivativeDiskBytes: 0, pendingCleanupBytes: 0, missingActiveFiles: 0, activeFiles: 0 };
  let cursor: string | undefined;
  for (;;) {
    const rows = await db().storedFile.findMany({take:100,orderBy:{id:"asc"},...(cursor?{cursor:{id:cursor},skip:1}:{}),include:{derivatives:true}});
    if (!rows.length) break;
    for(const file of rows) {
      if(!file.deletedAt) { result.originalQuotaBytes+=file.size; result.activeFiles++; }
      for(const [index,key] of [file.storageKey,...file.derivatives.map(d=>d.storageKey)].entries()) {
        ensure(/^[A-Za-z0-9_-]{43}$/.test(key),500,"INVALID_STORAGE_KEY");
        try { const entry=await stat(path.join(root,key));
          if(file.deletedAt) result.pendingCleanupBytes+=entry.size;
          else if(index===0) result.originalDiskBytes+=entry.size;
          else result.derivativeDiskBytes+=entry.size;
        } catch(e) { if((e as NodeJS.ErrnoException).code!=="ENOENT") throw e; if(!file.deletedAt) result.missingActiveFiles++; }
      }
    }
    cursor=rows[rows.length-1].id;
  }
  return result;
}
export async function retryDeletedCleanup() {
  let cursor:string|undefined, scanned=0;
  for(;;) {
    const rows=await db().storedFile.findMany({where:{deletedAt:{not:null}},select:{id:true},take:100,orderBy:{id:"asc"},...(cursor?{cursor:{id:cursor},skip:1}:{})});
    if(!rows.length) break;
    for(const row of rows) { await cleanDeletedFile(row.id); scanned++; }
    cursor=rows[rows.length-1].id;
  }
  return {scanned,...await auditStorage()};
}
