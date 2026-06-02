import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const standaloneServer = path.join(standaloneDir, "server.js");
const nextServer = path.join(standaloneDir, "next-server.js");

function copyDirectory(source, destination, { clean = false } = {}) {
  if (!fs.existsSync(source)) {
    return;
  }

  if (clean) {
    fs.rmSync(destination, { recursive: true, force: true });
  }

  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

if (!fs.existsSync(standaloneDir)) {
  throw new Error("Standalone build output was not found.");
}

copyDirectory(path.join(root, "public"), path.join(standaloneDir, "public"));
copyDirectory(
  path.join(root, ".next", "static"),
  path.join(standaloneDir, ".next", "static"),
  { clean: true },
);
copyDirectory(path.join(root, ".next", "static"), path.join(root, "_next", "static"), {
  clean: true,
});
copyDirectory(
  path.join(root, "src", "generated", "prisma"),
  path.join(standaloneDir, "src", "generated", "prisma"),
  { clean: true },
);
copyDirectory(
  path.join(root, "node_modules", ".prisma"),
  path.join(standaloneDir, "node_modules", ".prisma"),
  { clean: true },
);
copyDirectory(
  path.join(root, "node_modules", "@prisma", "client"),
  path.join(standaloneDir, "node_modules", "@prisma", "client"),
  { clean: true },
);

if (!fs.existsSync(standaloneServer)) {
  throw new Error("Standalone server.js was not found.");
}

const wrapperMarker = "[Maths4U Arena] Standalone wrapper";
const currentStandaloneServer = fs.readFileSync(standaloneServer, "utf8");

if (!currentStandaloneServer.includes(wrapperMarker)) {
  fs.rmSync(nextServer, { force: true });
  fs.renameSync(standaloneServer, nextServer);
  fs.writeFileSync(
    standaloneServer,
    `console.log("[Maths4U Arena] standalone wrapper loaded");

process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
process.env.PORT = process.env.PORT || "3000";
process.env.KEEP_ALIVE_TIMEOUT = process.env.KEEP_ALIVE_TIMEOUT || "65000";

function redactValue(message, value) {
  if (!value) {
    return message;
  }

  return message.split(value).join("[redacted]");
}

function safeServerError(error) {
  const name = error instanceof Error ? error.name : "UnknownError";
  const rawMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  let message = rawMessage;

  for (const value of [
    process.env.DATABASE_URL,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    process.env.ADMIN_PASSWORD,
    process.env.JWT_SECRET,
  ]) {
    message = redactValue(message, value);
  }

  return {
    name,
    message: message
      .replace(/mysql:\\/\\/[^@\\s]+@/gi, "mysql://[redacted]@")
      .replace(/for user\\s+'[^']+'/gi, "for user '[redacted]'")
      .replace(/password\\s*[:=]\\s*[^,\\s)]+/gi, "password=[redacted]")
      .slice(0, 300),
  };
}

process.on("uncaughtException", (error) => {
  console.error("[Maths4U Arena] Uncaught server exception", safeServerError(error));
});

process.on("unhandledRejection", (error) => {
  console.error("[Maths4U Arena] Unhandled server rejection", safeServerError(error));
});

process.on("SIGTERM", () => {
  console.log("[Maths4U Arena] SIGTERM received");
  process.exit(0);
});

process.on("beforeExit", (code) => {
  console.log("[Maths4U Arena] beforeExit", code);
});

console.log(
  "[Maths4U Arena] Standalone wrapper starting on " +
    process.env.HOSTNAME +
    ":" +
    process.env.PORT,
);

setInterval(() => {}, 2_147_483_647);
require("./next-server.js");
`,
  );
}

console.log("Standalone build prepared for Hostinger.");
