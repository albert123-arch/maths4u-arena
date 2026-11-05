import { db } from "../src/lib/prisma";
import { userSelect } from "../src/lib/security";
import { importSquareLocal, squareMappings } from "../src/lib/square-learning";
async function main() { try {
  const actor = await db().user.findFirstOrThrow({ where: { roles: { some: { role: "ADMIN" } }, status: "ACTIVE" }, select: userSelect });
  console.log(await importSquareLocal(actor));
  console.log({ validatedMappings: (await squareMappings()).size });
} finally { await db().$disconnect(); } }
void main().catch(() => { console.error("Local Square import failed; no credentials printed."); process.exitCode = 1; });
