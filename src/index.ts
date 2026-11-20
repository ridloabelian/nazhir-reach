import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { openDatabase } from './db/database.js';

const port = Number(process.env.PORT ?? '8793');
const hostname = process.env.HOST ?? '0.0.0.0';
const dbPath = process.env.DB_PATH ?? 'data/nazhir-reach.db';

const db = openDatabase(dbPath);
const app = createApp(db, { port });

const server = serve({
  fetch: app.fetch,
  port,
  hostname
});

process.stdout.write(
  `nazhir-reach running on http://localhost:${port} (db: ${dbPath})\n`
);

const shutdown = (): void => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
