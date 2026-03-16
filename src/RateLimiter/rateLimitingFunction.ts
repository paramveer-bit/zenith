import luaScript from './script'
import redis from '../Redis/redis.client';

async function isAllowed(userId: string, rate: number): Promise<boolean> {
    const key = `rate:${userId}`;
    const capacity = rate;
    const refillRate = rate; // 1 token/sec
    const now = Date.now();

    const result = await redis.eval(luaScript, 1, key, capacity, refillRate, now);
    return result === 1;
}
export default isAllowed;
