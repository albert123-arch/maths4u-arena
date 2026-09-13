// This wrapper only prepares the runtime. Next's generated server owns HTTP.
async function start() {
  const path = await import("node:path");
  process.chdir(__dirname);
  const { prepareRuntime } = await import("./runtime/setup.cjs");
  await prepareRuntime(path.resolve(__dirname));
  await import("./next-server.cjs");
}
void start().catch(error => {
  const message = error instanceof Error && error.message.startsWith("[Maths4U] Startup stopped at ")
    ? error.message : "[Maths4U] Startup failed; verify the complete Linux build artifact and runtime dependencies.";
  console.error(message);
  process.exitCode = 1;
});
