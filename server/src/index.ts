import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { env } from './config/env';
import './config/keys'; // Ensure PEM keys are loaded (warns if missing)

async function start(): Promise<void> {
  await connectRedis();
  await connectDatabase();
  const { default: app } = await import('./app');
  app.listen(env.PORT, () => {
    console.log(`[Server] Listening on port ${env.PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
