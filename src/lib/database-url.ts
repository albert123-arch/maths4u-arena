type DatabaseUrlSource = "db_parts" | "database_url" | "missing";

const databaseUrlKeys = {
  host: ["DB_HOST", "MYSQL_HOST", "MYSQLHOST"],
  port: ["DB_PORT", "MYSQL_PORT", "MYSQLPORT"],
  user: ["DB_USER", "MYSQL_USER", "MYSQLUSER"],
  password: ["DB_PASSWORD", "MYSQL_PASSWORD", "MYSQLPASSWORD"],
  name: ["DB_NAME", "MYSQL_DATABASE", "MYSQLDATABASE"],
} as const;

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

  return `mysql://${user}:${password}@${parts.host}:${parts.port}/${name}`;
}

export function getConfiguredDatabaseUrl() {
  return buildDatabaseUrlFromParts() ?? process.env.DATABASE_URL?.trim() ?? null;
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
  let databaseName: string | null = parts.name;

  if (configuredUrl) {
    try {
      const parsed = new URL(configuredUrl);
      const parsedName = parsed.pathname.replace(/^\/+/, "").split("/")[0];

      databaseUrlHost = parsed.hostname || databaseUrlHost;
      databaseName = parsedName ? decodeURIComponent(parsedName) : databaseName;
    } catch {
      databaseUrlHost = parts.host;
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
