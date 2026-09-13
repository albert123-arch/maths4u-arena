/* eslint-disable @typescript-eslint/no-require-imports -- Match the packaged Prisma CLI's CommonJS loader. */
// Loaded only as a private local child entrypoint. It exposes no HTTP endpoint.
console.error('[Maths4U:Prisma] node-entered');
try {
  const path = require('node:path');
  const cli = path.resolve(__dirname, '../node_modules/prisma/build/index.js');
  process.argv = [process.execPath, cli, ...process.argv.slice(2)];
  console.error('[Maths4U:Prisma] cli-loading');
  require(cli);
} catch (error) {
  const { errorCode } = require('./diagnostics.cjs');
  console.error('[Maths4U:Prisma] load-error code=' + errorCode(error));
  process.exitCode = 1;
}
