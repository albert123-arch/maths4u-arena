type DatabaseUrlSource = "db_parts" | "database_url" | "missing";

type DatabaseConnectionConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectTimeout: number;
  acquireTimeout: number;
  socketTimeout: number;
};

const databaseUrlKeys = {
  host: ["DB_HOST", "MYSQL_HOST", "MYSQLHOST"],
  port: ["DB_PORT", "MYSQL_PORT", "MYSQLPORT"],
  user: ["DB_USER", "MYSQL_USER", "MYSQLUSER"],
  password: ["DB_PASSWORD", "MYSQL_PASSWORD", "MYSQLPASSWORD"],
  name: ["DB_NAME", "MYSQL_DATABASE", "MYSQLDATABASE"],
} as const;

function normalizeHost(host: string) {
  return host.trim().toLowerCase() === "localhost" ? "127.0.0.1" : host.trim();
}

function parsePort(port: string | null) {
  const parsed = Number.parseInt(port ?? "3306", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3306;
}

function withTimeouts(config: Omit<DatabaseConnectionConfig, "connectTimeout" | "acquireTimeout" | "socketTimeout">) {
  return {
    ...config,
    connectTimeout: 5_000,
    acquireTimeout: 5_000,
    socketTimeout: 10_000,
  };
}

function firstEnvValue(keys: readonly string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function getDatabaseParts() {
  return {
    host: firstEnvValue(databaseUrlKeys.host),
    port: firstEnvValue(databaseUrlKeys.port) ?? "3306",
    user: firstEnvValue(databaseUrlKeys.user),
    password: firstEnvValue(databaseUrlKeys.password),
    name: firstEnvValue(databaseUrlKeys.name),
  };
}

function buildDatabaseUrlFromParts() {
  const parts = getDatabaseParts();

  if (!parts.host || !parts.user || !parts.password || !parts.name) {
    return null;
  }

  const user = encodeURIComponent(parts.user);
  const password = encodeURIComponent(parts.password);
  const name = encodeURIComponent(parts.name);
  const host = normalizeHost(parts.host);

  return `mysql://${user}:${password}@${host}:${parts.port}/${name}`;
}

export function getConfiguredDatabaseUrl() {
  const databaseUrlFromParts = buildDatabaseUrlFromParts();

  if (databaseUrlFromParts) {
    return databaseUrlFromParts;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(databaseUrl);
    parsed.hostname = normalizeHost(parsed.hostname);
    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

function getConnectionConfigFromParts(): DatabaseConnectionConfig | null {
  const parts = getDatabaseParts();

  if (!parts.host || !parts.user || !parts.password || !parts.name) {
    return null;
  }

  return withTimeouts({
    host: normalizeHost(parts.host),
    port: parsePort(parts.port),
    user: parts.user,
    password: parts.password,
    database: parts.name,
  });
}

function getConnectionConfigFromDatabaseUrl(): DatabaseConnectionConfig | null {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(databaseUrl);
    const database = parsed.pathname.replace(/^\/+/, "").split("/")[0];

    if (!parsed.hostname || !parsed.username || !parsed.password || !database) {
      return null;
    }

    return withTimeouts({
      host: normalizeHost(parsed.hostname),
      port: parsePort(parsed.port),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(database),
    });
  } catch {
    return null;
  }
}

export function getConfiguredDatabaseConnectionConfig() {
  return getConnectionConfigFromParts() ?? getConnectionConfigFromDatabaseUrl();
}

export function getDatabaseUrlSource(): DatabaseUrlSource {
  if (buildDatabaseUrlFromParts()) {
    return "db_parts";
  }

  if (process.env.DATABASE_URL?.trim()) {
    return "database_url";
  }

  return "missing";
}

export function getSafeDatabaseConfigInfo() {
  const configuredUrl = getConfiguredDatabaseUrl();
  const parts = getDatabaseParts();

  let databaseUrlHost: string | null = parts.host;
  let databaseHostEffective: string | null = parts.host ? normalizeHost(parts.host) : null;
  let databaseName: string | null = parts.name;

  if (configuredUrl) {
    try {
      const parsed = new URL(configuredUrl);
      const parsedName = parsed.pathname.replace(/^\/+/, "").split("/")[0];

      databaseUrlHost = parsed.hostname || databaseUrlHost;
      databaseHostEffective = parsed.hostname ? normalizeHost(parsed.hostname) : databaseHostEffective;
      databaseName = parsedName ? decodeURIComponent(parsedName) : databaseName;
    } catch {
      databaseUrlHost = parts.host;
      databaseHostEffective = parts.host ? normalizeHost(parts.host) : null;
      databaseName = parts.name;
    }
  }

  return {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    hasDbHost: Boolean(parts.host),
    hasDbUser: Boolean(parts.user),
    hasDbPassword: Boolean(parts.password),
    hasDbName: Boolean(parts.name),
    databaseUrlSource: getDatabaseUrlSource(),
    databaseUrlHost,
    databaseHostEffective,
    databaseName,
  };
}

export function getDatabaseRedactionValues() {
  const parts = getDatabaseParts();

  return [
    process.env.DATABASE_URL,
    parts.user,
    parts.password,
    firstEnvValue(["ADMIN_PASSWORD"]),
  ].filter((value): value is string => Boolean(value && value.length > 0));
}
