import { createClient } from 'redis';
type RedisClient = Awaited<ReturnType<typeof createClient>>;
export declare function connectRedis(): Promise<RedisClient | null>;
export declare function getRedis(): RedisClient | null;
export declare function isRedisAvailable(): boolean;
export {};
//# sourceMappingURL=redis.d.ts.map