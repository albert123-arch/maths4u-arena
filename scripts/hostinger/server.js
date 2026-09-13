/* eslint-disable @typescript-eslint/no-require-imports -- Hostinger loads this CommonJS entrypoint directly. */
const http = require('node:http');
const path = require('node:path');
let handler;
let server;

function fail(error) {
  const message = error instanceof Error && error.message.startsWith('[Maths4U] Startup stopped at ')
    ? error.message : '[Maths4U] Startup failed; verify the complete build and private configuration.';
  console.error(message);
  process.exitCode = 1;
  server?.close();
  server?.closeAllConnections();
  setTimeout(() => process.exit(1), 1000).unref();
}

async function start() {
  process.chdir(__dirname);
  const portText = process.env.PORT || '3000';
  if (process.env.MATHS4U_ENV !== 'production' || !/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) throw new Error();
  process.env.NODE_ENV = 'production';
  const port = Number(portText);
  server = http.createServer((request, response) => {
    if (!handler) {
      response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '5', Connection: 'close' });
      response.end('{"status":"starting"}');
      return;
    }
    Promise.resolve(handler(request, response)).catch(() => {
      if (!response.headersSent) response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end('{"error":"INTERNAL_ERROR"}');
    });
  });
  server.on('error', fail);
  // Listen before loading Prisma/Next or awaiting MySQL. No route, including
  // health/auth, is delegated until both database and Next preparation pass.
  server.listen(port, '0.0.0.0');
  console.log('[Maths4U] HTTP readiness gate listening; all routes return 503 until ready.');
  const { prepareRuntime } = await import('./runtime/setup.cjs');
  await prepareRuntime(path.resolve(__dirname));
  const prepareNext = require('./next-server.cjs');
  handler = await prepareNext(server, port);
  console.log('[Maths4U] Application ready; database and administrator preparation completed.');
}
void start().catch(fail);
