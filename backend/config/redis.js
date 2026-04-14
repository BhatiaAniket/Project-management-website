const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    // Disable built-in reconnect — we handle it manually once
    reconnectStrategy: false,
  },
});

let isRedisConnected = false;
let errorLogged = false;

// Only log the first connection error — suppress repeated ECONNREFUSED spam
redisClient.on('error', (err) => {
  if (!errorLogged) {
    errorLogged = true;
    console.warn('⚠️  Redis unavailable — running without Redis (caching & Socket.io scaling disabled).');
    if (process.env.NODE_ENV === 'development') {
      console.warn('   To enable Redis, install it locally or set REDIS_URL to a cloud Redis instance.');
    }
  }
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    isRedisConnected = true;
    console.log('✓ Redis connected — caching & Socket.io pub/sub enabled');
  } catch (err) {
    // Already handled by the 'error' event listener above — no duplicate log needed
  }
};

module.exports = {
  redisClient,
  connectRedis,
  isRedisConnected: () => isRedisConnected,
};
