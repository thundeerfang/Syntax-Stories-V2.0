import crypto from 'node:crypto';
import { getRedis } from '../config/redis.js';
import { redisKeys } from '../shared/redis/keys.js';
const AUTH_CHALLENGE_TTL_SECONDS = 10 * 60;
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
export async function createAuthChallenge(userId) {
    const redis = getRedis();
    if (!redis)
        throw new Error('Redis required for 2FA challenges');
    const raw = crypto.randomBytes(32).toString('hex');
    const key = redisKeys.challenge(hashToken(raw));
    await redis.setEx(key, AUTH_CHALLENGE_TTL_SECONDS, JSON.stringify({ userId }));
    return { challengeToken: raw, expiresIn: AUTH_CHALLENGE_TTL_SECONDS };
}
export async function consumeAuthChallenge(challengeToken) {
    const redis = getRedis();
    if (!redis)
        return null;
    const key = redisKeys.challenge(hashToken(challengeToken));
    const value = await redis.get(key);
    if (!value)
        return null;
    await redis.del(key);
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=authChallenge.js.map