import { readFile, writeFile, mkdir } from "node:fs/promises";
import { db } from "../src/lib/prisma";
import { databaseConfig } from "../src/lib/database-url";
import { userSelect } from "../src/lib/security";
import { importOriginalQuadraticsLocal } from "../src/lib/original-quadratics";
async function main(){
  const c=databaseConfig();
  if(process.env.MATHS4U_ENV!=="test"||c.host!=="127.0.0.1"||!c.database.startsWith("maths4u_test_bank_"))throw new Error("ORIGINAL_LOCAL_ONLY");
  const actor=await db().user.findFirstOrThrow({where:{roles:{some:{role:"ADMIN"}},status:"ACTIVE"},select:userSelect});
  const pack=JSON.parse(await readFile("content/original/quadratics-v1.json","utf8"));
  const result=await importOriginalQuadraticsLocal(actor,pack);
  await mkdir(".local/original-quadratics",{recursive:true});
  await writeFile(".local/original-quadratics/import.json",JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e instanceof Error&&/^ORIGINAL_[A-Z_]+$/.test(e.message)?e.message:"ORIGINAL_LOCAL_IMPORT_FAILED");process.exitCode=1;}).finally(()=>db().$disconnect());
