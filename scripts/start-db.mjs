/**
 * Dev-only Postgres for machines without a system PostgreSQL: a real
 * Postgres 17 cluster (from the @embedded-postgres/windows-x64 binaries)
 * listening on localhost:5433, data persisted in ~/.travelcrm-pgdata.
 *
 *   node scripts/start-db.mjs [port]
 *
 * First run initialises the cluster; later runs just start it.
 */
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'fs';
import os from 'os';
import path from 'path';

const port = Number(process.argv[2] ?? 5433);
const databaseDir = path.join(os.homedir(), '.travelcrm-pgdata');

const pg = new EmbeddedPostgres({
  databaseDir,
  persistent: true,
  port,
  user: 'postgres',
  password: 'postgres',
  // Windows locales default to WIN1252, which cannot store emoji (country
  // flags in seeded data) — force a UTF8 cluster.
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: (m) => console.log(m),
  onError: (m) => console.error(m),
});

const isNewCluster = !fs.existsSync(path.join(databaseDir, 'PG_VERSION'));
if (isNewCluster) {
  console.log(`Initialising Postgres cluster in ${databaseDir}...`);
  await pg.initialise();
}

await pg.start();
console.log(`Postgres listening on postgres://postgres:postgres@localhost:${port}/postgres`);

const stop = async () => {
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
