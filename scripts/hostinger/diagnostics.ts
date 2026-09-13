// Output is an allowlisted summary, never raw child output or Error.message.
const systemCodes = new Set(["EACCES", "EPERM", "ENOENT", "ENOEXEC", "ENOTDIR", "E2BIG", "EAGAIN", "ENOMEM", "ENOBUFS", "ETIMEDOUT", "EBADF", "EPIPE", "UNKNOWN"]);
const nodeCodes = ["MODULE_NOT_FOUND", "ERR_MODULE_NOT_FOUND", "ERR_REQUIRE_ESM", "ERR_REQUIRE_ASYNC_MODULE", "ERR_DLOPEN_FAILED", "ERR_INVALID_ARG_TYPE", "ERR_INVALID_ARG_VALUE", "ERR_OUT_OF_RANGE", "ERR_UNKNOWN_FILE_EXTENSION", "ERR_PACKAGE_PATH_NOT_EXPORTED", "ERR_UNSUPPORTED_DIR_IMPORT"];
const signals = new Set(["SIGTERM", "SIGKILL", "SIGABRT", "SIGSEGV", "SIGBUS", "SIGILL", "SIGINT", "SIGHUP", "SIGQUIT"]);
const markers = ["node-entered", "cli-loading", "config-entered", "config-ready"];
type Result = { status?: unknown; signal?: unknown; error?: unknown; stdout?: unknown; stderr?: unknown };
function output(value: unknown) { return typeof value === "string" ? value : Buffer.isBuffer(value) ? value.toString("utf8") : ""; }
export function errorCode(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  return typeof code === "string" && (systemCodes.has(code) || nodeCodes.includes(code)) ? code : error ? "UNKNOWN" : "none";
}
export function childDiagnostic(result: Result, thrown = false) {
  const stdout = output(result.stdout), stderr = output(result.stderr);
  const combined = stdout + "\n" + stderr;
  const node = nodeCodes.filter(code => new RegExp("\\b" + code + "\\b").test(combined));
  const prisma = [...new Set(combined.match(/\bP[1-7]\d{3}\b/g) || [])].slice(0, 5);
  const hints = [];
  if (/error while loading shared libraries|cannot open shared object file/i.test(combined)) hints.push("DYNAMIC_LINKER");
  if (/libssl\.so|libcrypto\.so|openssl.*not found/i.test(combined)) hints.push("OPENSSL_LIBRARY");
  if (/GLIBC_[\d.]+.*not found/i.test(combined)) hints.push("GLIBC_VERSION");
  if (/permission denied/i.test(combined)) hints.push("PERMISSION_DENIED");
  if (/heap out of memory|allocation failed/i.test(combined)) hints.push("OUT_OF_MEMORY");
  if (/Failed to load config/i.test(combined)) hints.push("CONFIG_LOAD_FAILED");
  let loaded = "not-entered";
  for (const marker of markers) if (combined.includes("[Maths4U:Prisma] " + marker)) loaded = marker;
  if (/Prisma schema loaded from/.test(combined)) loaded = "schema-loaded";
  return { status: Number.isInteger(result.status) ? result.status : null,
    signal: typeof result.signal === "string" && signals.has(result.signal) ? result.signal : result.signal ? "UNKNOWN" : "none",
    system: errorCode(result.error), thrown, loaded, node, prisma, hints,
    stdoutBytes: Buffer.byteLength(stdout), stderrBytes: Buffer.byteLength(stderr) };
}
