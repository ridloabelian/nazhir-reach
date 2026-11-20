import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { openDatabase } from './db/database.js';
import { seedDemoData } from './db/seed.js';

const port = Number(process.env.PORT ?? '8793');
const hostname = process.env.HOST ?? '0.0.0.0';
const dbPath = process.env.DB_PATH ?? ':memory:';

const db = openDatabase(dbPath);
seedDemoData(db);

const app = createApp(db, { port });

const server = serve({
  fetch: app.fetch,
  port,
  hostname
});

process.stdout.write(
  `nazhir-reach DEMO server running on http://localhost:${port} (La Yufti Governance Active)\n`
);

const shutdown = (): void => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
