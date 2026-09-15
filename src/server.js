import fastify from 'fastify';
import multipart from '@fastify/multipart';
import { ensureDirs } from './dirs.js';
import { config } from './config.js';
import { startIncomingWatcher } from './lib/watcher.js';

const app = fastify({ logger: true });

await app.register(multipart);

import { registerRoutes } from './routes.js';
import { registerAuth } from './lib/auth.js';

await ensureDirs([config.data_dir, config.incoming_dir,
config.processed_dir, config.failed_dir, config.archive_dir, config.staging_dir]);

console.log('Server directories ensured.');


await registerAuth(app);
await registerRoutes(app);
console.log(`Server is starting on port ${config.port}`);
await app.listen({ port: config.port });
startIncomingWatcher({ logger: app.log });