import { db } from "../src/lib/prisma";
import { userSelect } from "../src/lib/security";
import { importSquareLocal, squareMappings } from "../src/lib/square-learning";
import { quadraticTopics } from "../src/lib/square-model";
async function main() { try {
  const actor = await db().user.findFirstOrThrow({ where: { roles: { some: { role: "ADMIN" } }, status: "ACTIVE" }, select: userSelect });
  for (const topic of quadraticTopics) {
    console.log({ topic: topic.key, ...await importSquareLocal(actor,topic,process.argv.includes("--revise-unused-extension")), validatedMappings: (await squareMappings(topic.key)).size });
  }
} finally { await db().$disconnect(); } }
void main().catch(e => { console.error("Local Quadratics import failed:", e instanceof Error ? e.message : "unknown error"); process.exitCode = 1; });
