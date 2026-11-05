import { readFile, mkdir, writeFile } from "node:fs/promises";
import { db } from "../src/lib/prisma";
import { userSelect } from "../src/lib/security";
import { databaseConfig } from "../src/lib/database-url";
import { importPure1ShortLocal } from "../src/lib/pure1-short-practice";
async function main(){
 const cfg=databaseConfig();if(process.env.MATHS4U_ENV!=="test"||cfg.host!=="127.0.0.1"||!cfg.database.startsWith("maths4u_test_bank_"))throw Error("P1_SHORT_LOCAL_ONLY");
 const actor=await db().user.findFirstOrThrow({where:{status:"ACTIVE",roles:{some:{role:"ADMIN"}}},select:userSelect}),pack=JSON.parse(await readFile("content/original/pure1-short-practice-v1.json","utf8"));
 const result=await importPure1ShortLocal(actor,pack);await mkdir(".local/pure1-short-practice",{recursive:true});await writeFile(".local/pure1-short-practice/import.json",JSON.stringify(result,null,2));console.log(JSON.stringify({created:result.created,skipped:result.skipped,skills:result.skills}));
}main().catch(e=>{console.error(e instanceof Error&&/^P1_SHORT_[A-Z_]+$/.test(e.message)?e.message:"P1_SHORT_IMPORT_FAILED");process.exitCode=1;}).finally(()=>db().$disconnect());
