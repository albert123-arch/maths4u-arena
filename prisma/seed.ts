import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { db } from "../src/lib/prisma";
import { userSelect } from "../src/lib/security";
import { importMaterials } from "../src/lib/importer";
import { saveCourse } from "../src/lib/courses";
config({ path: ".env.local", quiet: true });
async function main() {
  const actor = await db().user.findFirst({ where: { roles: { some: { role: "ADMIN" } } }, select: userSelect });
  if (!actor) throw new Error("Create the first administrator before seeding materials.");
  for (const name of ["arena", "maths4u", "olymp"]) {
    const input = JSON.parse(await readFile("fixtures/" + name + ".json", "utf8"));
    console.log(name, await importMaterials(actor, input));
  }
  if (!await db().course.findUnique({ where: { slug: "foundations" } })) {
    await saveCourse(actor, { slug: "foundations", topicSlug: "divisibility", topicRu: "Делимость", topicEn: "Divisibility",
      texts: [{ locale: "ru", title: "Математика: основы", description: "Теория, практика и первые доказательства." },
        { locale: "en", title: "Mathematics foundations", description: "Theory, practice and first proofs." }],
      lessonRu: "<p>Число \\(a\\) делит \\(b\\), если существует целое \\(k\\), для которого \\(b=ak\\).</p><p>Например, \\(3\\mid 12\\), поскольку \\(12=3\\cdot4\\).</p>",
      lessonEn: "<p>We say \\(a\\) divides \\(b\\) if there is an integer \\(k\\) with \\(b=ak\\).</p><p>For example, \\(3\\mid12\\), since \\(12=3\\cdot4\\).</p>",
    });
  }
  console.log("Sample materials ready. Imported tasks remain private until an administrator publishes them.");
}
main().catch(() => { console.error("Seed failed: create an administrator and check the isolated database."); process.exitCode = 1; })
  .finally(() => db().$disconnect());
