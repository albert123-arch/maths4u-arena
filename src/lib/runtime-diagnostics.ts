type SafeDatabaseUrlInfo = {
  hasDatabaseUrl: boolean;
  databaseHost: string | null;
  databaseName: string | null;
};

type DatabaseUrlParts = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

type ErrorLike = {
  code?: unknown;
  errno?: unknown;
  sqlState?: unknown;
  message?: unknown;
};

function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || null;
}

function getErrorProperty(error: unknown, key: keyof ErrorLike) {
  if (!error || typeof error !== "object" || !(key in error)) {
    return null;
  }

  const value = (error as ErrorLike)[key];
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function redactValue(message: string, value: string | null | undefined) {
  if (!value) {
    return message;
  }

  return message.replaceAll(value, "[redacted]");
}

export function getSafeDatabaseUrlInfo(): SafeDatabaseUrlInfo {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    return {
      hasDatabaseUrl: false,
      databaseHost: null,
      databaseName: null,
    };
  }

  try {
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\/+/, "").split("/")[0];

    return {
      hasDatabaseUrl: true,
      databaseHost: parsed.hostname || null,
      databaseName: databaseName ? decodeURIComponent(databaseName) : null,
    };
  } catch {
    return {
      hasDatabaseUrl: true,
      databaseHost: null,
      databaseName: null,
    };
  }
}

export function parseDatabaseUrlForConnection(): DatabaseUrlParts | null {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(databaseUrl);
    const database = parsed.pathname.replace(/^\/+/, "").split("/")[0];
    const port = Number.parseInt(parsed.port || "3306", 10);

    if (!parsed.hostname || !parsed.username || !parsed.password || !database) {
      return null;
    }

    return {
      host: parsed.hostname,
      port: Number.isFinite(port) && port > 0 ? port : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(database),
    };
  } catch {
    return null;
  }
}

export function safeErrorMessage(error: unknown) {
  const databaseUrl = getDatabaseUrl();
  const parts = parseDatabaseUrlForConnection();
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";

  let message = rawMessage;

  message = redactValue(message, databaseUrl);
  message = redactValue(message, parts?.user);
  message = redactValue(message, parts?.password);

  const safeMessage = message
    .replace(/mysql:\/\/[^@\s]+@/gi, "mysql://[redacted]@")
    .replace(/for user\s+'[^']+'/gi, "for user '[redacted]'")
    .replace(/password\s*[:=]\s*[^,\s)]+/gi, "password=[redacted]")
    .trim()
    .slice(0, 300);

  return safeMessage || "No error message available.";
}

export function getSafeErrorCode(error: unknown) {
  return getErrorProperty(error, "code");
}

export function getSafeMysqlErrorInfo(error: unknown) {
  const code = getErrorProperty(error, "code");
  const message = safeErrorMessage(error);

  return {
    code,
    errno: getErrorProperty(error, "errno"),
    sqlState: getErrorProperty(error, "sqlState"),
    message: message === "No error message available." && code ? `MySQL error ${code}` : message,
  };
}

export async function checkPrismaConnection() {
  const { prisma } = await import("@/lib/prisma");

  await prisma.$queryRaw`SELECT 1`;
}
