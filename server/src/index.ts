import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { env } from './config/env.js';
import './config/keys.js'; // Ensure PEM keys are loaded (warns if missing)

async function start(): Promise<void> {
  await connectRedis();
  await connectDatabase();
  const { default: app } = await import('./app.js');
  app.listen(env.PORT, () => {
    console.log(`[Server] Listening on port ${env.PORT}`);
  });
}

try {
  await start();
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
