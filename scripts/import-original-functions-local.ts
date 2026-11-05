import { readFile, writeFile, mkdir } from "node:fs/promises";
import { db } from "../src/lib/prisma";
import { databaseConfig } from "../src/lib/database-url";
import { userSelect } from "../src/lib/security";
import { importOriginalBlockLocal, originalBlockSchema } from "../src/lib/original-blocks";
async function main(){
  const cfg=databaseConfig();
  if(process.env.MATHS4U_ENV!=="test"||cfg.host!=="127.0.0.1"||!cfg.database.startsWith("maths4u_test_bank_"))throw new Error("ORIGINAL_LOCAL_ONLY");
  const actor=await db().user.findFirstOrThrow({where:{roles:{some:{role:"ADMIN"}},status:"ACTIVE"},select:userSelect});
  const pack=originalBlockSchema.parse(JSON.parse(await readFile("content/original/functions-v1.json","utf8")));
  if(pack.key!=="maths4u-original-functions")throw new Error("ORIGINAL_WRONG_BLOCK");
  const result=await importOriginalBlockLocal(actor,pack);
  await mkdir(".local/original-functions",{recursive:true});
  await writeFile(".local/original-functions/import.json",JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e instanceof Error&&/^ORIGINAL_[A-Z_]+$/.test(e.message)?e.message:"ORIGINAL_LOCAL_IMPORT_FAILED");process.exitCode=1;}).finally(()=>db().$disconnect());
