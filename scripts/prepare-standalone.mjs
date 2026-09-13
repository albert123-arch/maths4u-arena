import fs from "node:fs";
import path from "node:path";
const root = process.cwd(), standalone = path.join(root, ".next", "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) throw new Error("Standalone build output is missing.");
for (const relative of ["public", ".next/static"]) {
  const source = path.join(root, relative), target = path.join(standalone, relative);
  if (fs.existsSync(source)) fs.cpSync(source, target, { recursive: true });
}
// Next tracing can copy dotenv files into output. Hosting must receive private runtime
// environment variables explicitly, never the developer's or legacy database secrets.
for (const name of fs.readdirSync(standalone)) {
  if (name === ".env" || name.startsWith(".env.")) fs.unlinkSync(path.join(standalone, name));
}
console.log("Standalone ready; private dotenv files excluded from the distributable.");
