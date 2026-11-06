import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Prisma } from "../generated/prisma/client";
import type { ContentPackage } from "./content-package-schema";
import { privateStorageRoot } from "./storage-config";
import { ensure } from "./errors";
import { db } from "./prisma";
import { materialGrant } from "./material-grant";
import type { Actor } from "./security";

type Asset=NonNullable<ContentPackage["assets"]>[number];
export async function readPackageAssets(p:ContentPackage) {
  return Promise.all((p.assets??[]).map(async asset=>{
    const resolved=await fs.realpath(path.resolve(asset.path)),root=await fs.realpath(path.resolve("content/original"));
    const relative=path.relative(root,resolved);
    ensure(relative!==""&&!relative.startsWith("..")&&!path.isAbsolute(relative),409,"INVALID_PACKAGE_ASSET");
    const data=await fs.readFile(resolved);
    ensure(data.length===asset.size&&createHash("sha256").update(data).digest("hex")===asset.sha256,409,"PACKAGE_ASSET_CHANGED");
    ensure(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&data.readUInt32BE(16)===asset.width&&data.readUInt32BE(20)===asset.height,409,"INVALID_PACKAGE_IMAGE");
    return {asset,data};
  }));
}
export async function installPackageAssets(tx:Prisma.TransactionClient,actor:Actor,files:Awaited<ReturnType<typeof readPackageAssets>>) {
  for(const {asset,data} of files){
    const existing=await tx.storedFile.findUnique({where:{id:asset.file_id}});
    ensure(!existing||!existing.deletedAt&&existing.sha256===asset.sha256&&existing.size===asset.size&&existing.mimeType===asset.mime,409,"PACKAGE_ASSET_COLLISION");
    if(existing)continue;
    const root=privateStorageRoot(),storageKey=Buffer.from(asset.sha256,"hex").toString("base64url"),target=path.join(root,storageKey);
    await fs.mkdir(root,{recursive:true});
    try{await fs.writeFile(target,data,{flag:"wx"});}catch(e){
      if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;
      ensure(createHash("sha256").update(await fs.readFile(target)).digest("hex")===asset.sha256,409,"PACKAGE_STORAGE_COLLISION");
    }
    await tx.storedFile.create({data:{id:asset.file_id,ownerId:actor.id,storageKey,originalName:"lesson-diagram.png",mimeType:asset.mime,size:asset.size,sha256:asset.sha256,width:asset.width,height:asset.height}});
  }
}
export function packageTaskAssets(p:ContentPackage,uid:string){
  return (p.assets??[]).filter(a=>a.question_uid===uid).map((a:Asset)=>({fileId:a.file_id,role:a.role,locale:"en" as const,caption:a.caption}));
}
// Use the existing StoredFile/Asset and material-grant boundary. Solutions are
// not static public files, and old TaskVersion assets keep their original bytes.
export async function grantPackageHelp(html:string,versionId:string,kind:"hint"|"solution",actor:Actor|null){
  if(!html.includes("/api/files/"))return html;
  const assets=await db().taskAsset.findMany({where:{versionId,role:{in:kind==="solution"?["SOLUTION","ANSWER"]:["HINT"]}}});
  const grants=new Map(assets.map(a=>[a.fileId,materialGrant({fileId:a.fileId,versionId,role:a.role,actorId:actor?.id??null})]));
  return html.replace(/\bsrc=(['"])(\/api\/files\/([\w-]+))\1/g,(all,quote,url,id)=>grants.has(id)?'src='+quote+url+'?support='+grants.get(id)+quote:all);
}
