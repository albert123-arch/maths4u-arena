import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/prisma";
import { databaseConfig } from "../src/lib/database-url";
import { hashPassword } from "../src/lib/password";
async function main(){
const cfg=databaseConfig();
if(process.env.MATHS4U_ENV!=="test"||cfg.host!=="127.0.0.1"||cfg.port!==33317||!cfg.database.startsWith("maths4u_test_bank_c1_"))throw Error("C1_LOCAL_ONLY");
let fixture:{password:string;admin?:string;teacher?:string;student?:string};
try{fixture=JSON.parse(await fs.readFile(".local/c1-20261106/fixture.json","utf8"));}catch{fixture={password:randomBytes(24).toString("base64url")};}
try{
 const passwordHash=await hashPassword(fixture.password);
 for(const role of ["ADMIN","TEACHER","STUDENT"] as const){
  const username="qa_c1_"+role.toLowerCase();
  const user=await db().user.upsert({where:{username},create:{username,displayName:"Local C1 "+role.toLowerCase(),passwordHash,roles:{create:{role}},profile:{create:{locale:"en"}}},update:{}});
  fixture[role.toLowerCase() as "admin"|"teacher"|"student"]=user.id;
 }
 await fs.writeFile(".local/c1-20261106/fixture.json",JSON.stringify(fixture));
 console.log(JSON.stringify({localOnly:true,syntheticAccounts:3}));
}finally{await db().$disconnect();}
}
void main().catch(e=>{console.error(e.code??"C1_FIXTURE_FAILED");process.exitCode=1;});
