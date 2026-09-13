import { spawn } from "node:child_process";

// Keep the HTTP readiness gate responsive while Prisma runs. Capture output only
// in memory; callers log the allowlisted diagnostic, never these raw streams.
export async function migrationChild(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv) {
  return new Promise<{ status: number | null; signal: NodeJS.Signals | null; error?: unknown; stdout: string; stderr: string; thrown: boolean }>(resolve => {
    let stdout = "", stderr = "", error: unknown;
    let child: ReturnType<typeof spawn>;
    try { child = spawn(command, args, { cwd, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }); }
    catch (error) { resolve({ status: null, signal: null, error, stdout, stderr, thrown: true }); return; }
    const limit = 2 * 1024 * 1024;
    let bytes = 0;
    let forceKill: ReturnType<typeof setTimeout> | undefined;
    const timeout = setTimeout(() => {
      error = Object.assign(new Error(), { code: "ETIMEDOUT" });
      child.kill("SIGTERM");
      forceKill = setTimeout(() => child.kill("SIGKILL"), 5000);
      forceKill.unref();
    }, 120000);
    timeout.unref();
    function collect(data: Buffer, stream: "stdout" | "stderr") {
      bytes += data.length;
      if (bytes > limit) { error = Object.assign(new Error(), { code: "ENOBUFS" }); child.kill("SIGKILL"); return; }
      if (stream === "stdout") stdout += data.toString("utf8"); else stderr += data.toString("utf8");
    }
    child.stdout?.on("data", data => collect(data, "stdout"));
    child.stderr?.on("data", data => collect(data, "stderr"));
    child.on("error", failure => { error = failure; });
    child.on("close", (status, signal) => {
      clearTimeout(timeout);
      if (forceKill) clearTimeout(forceKill);
      resolve({ status, signal, error, stdout, stderr, thrown: false });
    });
  });
}
