const { createClient } = require('redis');

let redisClientPromise = null;

function getRedisUrl() {
  const redisUrl = String(process.env.REDIS_URL || '').trim();
  return redisUrl || null;
}

async function createRedisClient() {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    return null;
  }

  const client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy(retries) {
        return Math.min(retries * 100, 3000);
      },
    },
  });

  client.on('error', (error) => {
    console.error('[redis] client error:', error?.message || error);
  });

  await client.connect();
  return client;
}

function getRedisClient() {
  if (!redisClientPromise) {
    redisClientPromise = createRedisClient().catch((error) => {
      redisClientPromise = null;
      console.error('[redis] unable to connect:', error?.message || error);
      return null;
    });
  }

  return redisClientPromise;
}

module.exports = {
  getRedisClient,
  getRedisUrl,
};
