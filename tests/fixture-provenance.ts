import assert from "node:assert/strict";
import {db} from "../src/lib/prisma";
import {cambridgeTask} from "../src/lib/cambridge-access";
/** Explicit owner approval for synthetic teaching fixtures, never a policy bypass. */
export async function approveSyntheticTasks(ids:string[]) {
  const u=new URL(process.env.MATHS4U_DATABASE_URL!);
  assert.equal(process.env.MATHS4U_ENV,"test");assert.equal(u.hostname,"127.0.0.1");assert.match(u.pathname,/^\/maths4u_test_/);
  assert.equal(await db().task.count({where:{id:{in:ids},...cambridgeTask}}),0,"A synthetic fixture must not be marked Cambridge to bypass its archive");
  const changed=await db().task.updateMany({where:{id:{in:ids}},data:{origin:"ORIGINAL",originManual:true,originReason:"Synthetic authored test fixture explicitly approved by its test owner",originRule:"test-fixture-only"}});
  assert.equal(changed.count,ids.length);
}
