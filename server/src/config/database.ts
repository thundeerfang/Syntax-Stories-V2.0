import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(): Promise<void> {
  const uri = env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI (MONGO_CONN) is required');
  try {
    await mongoose.connect(uri);
    console.log('[MongoDB] Connected');
  } catch (err) {
    console.error('[MongoDB] Connection error:', err);
    throw err;
  }
}
