const Redis = require('ioredis');

let redis = null;

const connectRedis = () => {
  try {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && !redisUrl.includes('YOUR_')) {
      redis = new Redis(process.env.REDIS_URL, {
        tls: {},
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true
      });

      let errorLogged = false;
      redis.on('connect', () => console.log('Redis Connected'));
      redis.on('error', (err) => {
        if (!errorLogged) {
          console.log('Redis Error:', err.message);
          errorLogged = true;
        }
      });

      redis.connect().catch(() => {
        console.log('Redis not available, running without cache');
        redis = null;
      });
    } else {
      console.log('No Redis URL, running without cache');
    }
  } catch (err) {
    console.log('Redis init failed, running without cache');
    redis = null;
  }
  return redis;
};

const getRedis = () => redis;

const cacheGet = async (key) => {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

const cacheSet = async (key, value, ttl = 300) => {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch { }
};

const cacheDel = async (key) => {
  if (!redis) return;
  try { await redis.del(key); } catch { }
};

module.exports = { connectRedis, getRedis, cacheGet, cacheSet, cacheDel };
