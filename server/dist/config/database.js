import mongoose from 'mongoose';
import { env } from './env.js';
import { ensureFeedbackCategorySeeds } from '../modules/feedback/ensureFeedbackCategorySeeds.js';
export async function connectDatabase() {
    const uri = env.MONGODB_URI;
    if (!uri)
        throw new Error('MONGODB_URI (MONGO_CONN) is required');
    try {
        await mongoose.connect(uri);
        console.log('[MongoDB] Connected');
        await ensureFeedbackCategorySeeds();
    }
    catch (err) {
        console.error('[MongoDB] Connection error:', err);
        throw err;
    }
}
//# sourceMappingURL=database.js.map