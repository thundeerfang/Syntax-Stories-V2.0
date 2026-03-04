import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('[MongoDB] Connected');
  } catch (err) {
    console.error('[MongoDB] Connection error:', err);
    throw err;
  }
}
