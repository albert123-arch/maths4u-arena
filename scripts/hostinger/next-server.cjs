/* eslint-disable @typescript-eslint/no-require-imports -- This CommonJS server and its dependencies are explicitly packaged. */
// LiteSpeed allows one listen() call. Reuse the gated HTTP server through Next's
// server API instead of also starting the generated standalone listener.
module.exports = async function prepareNext(server, port) {
  const fs = require('node:fs');
  const path = require('node:path');
  const { config } = JSON.parse(fs.readFileSync(path.join(__dirname, '.next/required-server-files.json'), 'utf8'));
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  const next = require('next');
  const app = next({ dev: false, dir: __dirname, hostname: '0.0.0.0', port, httpServer: server, conf: config });
  await app.prepare();
  return app.getRequestHandler();
};
