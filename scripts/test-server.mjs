import { config } from "dotenv";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
config({ path: ".local/test.env", override: true, quiet: true });
if (!/^maths4u_test(?:_|$)/.test(process.env.MATHS4U_DATABASE_NAME || "")) throw new Error("A dedicated test database is required.");
process.env.APP_URL = "http://localhost:3100";
process.env.HOSTNAME = "127.0.0.1";
process.env.PORT = "3100";
const stopFile = fileURLToPath(new URL("../.local/ui-server.stop", import.meta.url));
if (fs.existsSync(stopFile)) fs.unlinkSync(stopFile);
// Windows sandbox may refuse killing a child process tree. The test runner requests
// teardown through this private local file, so the test server can exit itself.
setInterval(() => { if (fs.existsSync(stopFile)) process.exit(0); }, 250).unref();
await import("../.next/standalone/server.js");
