import http from 'http';
import app from './app.js';
import { env, assertBootSafety } from './config/env.js';
import { connectDB } from './config/db.js';
import { initSockets } from './sockets/index.js';

assertBootSafety();

const httpServer = http.createServer(app);
initSockets(httpServer);

connectDB().finally(() => {
  httpServer.listen(env.PORT, () => {
    console.log(`[server] SkillSphere API + sockets listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('[fatal] Unhandled rejection:', err);
});
