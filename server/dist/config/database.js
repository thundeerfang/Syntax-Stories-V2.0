import mongoose from 'mongoose';
import { env } from './env.js';
import { ensureFeedbackCategorySeeds } from '../modules/feedback/ensureFeedbackCategorySeeds.js';
import { ensureSyntaxAdminSeed } from '../bootstrap/ensureSyntaxAdminSeed.js';
import { ensureAdminAccessCatalogSeed } from '../modules/admin/bootstrap/ensureAdminAccessCatalogSeed.js';
import { ensureLegalPoliciesSeed } from '../modules/legal/ensureLegalPoliciesSeed.js';
export async function connectDatabase() {
    const uri = env.MONGODB_URI;
    if (!uri)
        throw new Error('MONGODB_URI (MONGO_CONN) is required');
    try {
        await mongoose.connect(uri);
        console.log('[MongoDB] Connected');
        await ensureFeedbackCategorySeeds();
        await ensureSyntaxAdminSeed();
        await ensureAdminAccessCatalogSeed();
        await ensureLegalPoliciesSeed();
    }
    catch (err) {
        console.error('[MongoDB] Connection error:', err);
        throw err;
    }
}
//# sourceMappingURL=database.js.map