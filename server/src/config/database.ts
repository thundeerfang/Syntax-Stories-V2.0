import mongoose from 'mongoose';
import { env } from './env.js';
import { runAdminPlatformSeeds } from '../admin-platform/seeds/runAdminPlatformSeeds.js';
import { ensureTechStackReferenceSeed } from '../bootstrap/ensureTechStackReferenceSeed.js';

export async function connectDatabase(): Promise<void> {
  const uri = env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI (MONGO_CONN) is required — set server/.env from MongoDB Atlas → Connect → Drivers'
    );
  }
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15_000,
      socketTimeoutMS: 45_000,
      maxPoolSize: 20,
      retryWrites: true,
    });
    console.log('[MongoDB] Connected');

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected — background jobs will retry when the link is back');
    });
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err.message);
    });

    await runAdminPlatformSeeds();
    await ensureTechStackReferenceSeed();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[MongoDB] Connection error:', msg);
    if (msg.includes('ENOTFOUND') || msg.includes('MongoServerSelectionError')) {
      console.error(
        '[MongoDB] DNS could not resolve your Atlas hostnames. Check internet/VPN, that the cluster is not paused, and that MONGO_CONN in server/.env matches Atlas → Connect.'
      );
    }
    throw err;
  }
}
