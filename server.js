console.log("[Maths4U Arena] server.js loaded");

process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
process.env.PORT = process.env.PORT || "3000";

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
      .replace(/mysql:\/\/[^@\s]+@/gi, "mysql://[redacted]@")
      .replace(/for user\s+'[^']+'/gi, "for user '[redacted]'")
      .replace(/password\s*[:=]\s*[^,\s)]+/gi, "password=[redacted]")
      .slice(0, 300),
  };
}

process.on("uncaughtException", (error) => {
  console.error("Uncaught server exception", safeServerError(error));
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled server rejection", safeServerError(error));
});

console.log(
  "[Maths4U Arena] Starting root server on " + process.env.HOSTNAME + ":" + process.env.PORT,
);

void import("./.next/standalone/server.js");
