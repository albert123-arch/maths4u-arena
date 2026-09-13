// Deliberately do not fall back to legacy DATABASE_URL or DB_*.
export function databaseConfig() {
  const raw = process.env.MATHS4U_DATABASE_URL;
  const expected = process.env.MATHS4U_DATABASE_NAME;
  if (!raw || !expected) throw new Error("Configure MATHS4U_DATABASE_URL and MATHS4U_DATABASE_NAME explicitly.");
  let url: URL;
  let name: string;
  try {
    url = new URL(raw);
    name = decodeURIComponent(url.pathname.slice(1));
    decodeURIComponent(url.username);
    decodeURIComponent(url.password);
  } catch {
    // URL/URI errors may include their raw input; never attach private values.
    throw new Error("Invalid Maths4U database connection format.");
  }
  if (url.protocol !== "mysql:" || name !== expected || !/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error("Database target does not match the explicit Maths4U database name.");
  }
  if (process.env.MATHS4U_ENV !== "production" && (!/^maths4u_(dev|test)(_|$)/.test(name) || !["127.0.0.1", "localhost"].includes(url.hostname))) {
    throw new Error("Development requires a loopback maths4u_dev/test database.");
  }
  return { raw, host: url.hostname, port: Number(url.port || 3306), database: name,
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    connectionLimit: 8, connectTimeout: 5000, acquireTimeout: 10000 };
}
