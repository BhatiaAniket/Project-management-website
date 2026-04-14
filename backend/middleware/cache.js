const { redisClient } = require('../config/redis');

/**
 * Cache middleware to cache API responses and dramatically reduce DB load.
 * @param {number} duration - Time in seconds to cache the response.
 */
const cacheMiddleware = (duration = 60) => {
  return async (req, res, next) => {
    // We only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip if Redis is not connected
    if (!redisClient.isReady) {
      console.log('Redis is offline, bypassing cache');
      return next();
    }

    try {
      // Create a unique cache key based on URL, user/company scope, and query params
      const companyId = req.user?.company || 'global';
      const cacheKey = `cache:${companyId}:${req.originalUrl}`;

      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        // Return cached response via Express
        return res.status(200).json(JSON.parse(cachedData));
      }

      // Intercept the `res.json` to automatically cache outgoing responses before they are sent
      const originalSend = res.json;
      res.json = function (body) {
        // Only cache successful requests
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setEx(cacheKey, duration, JSON.stringify(body))
            .catch(err => console.error('Redis cache set error:', err));
        }
        
        originalSend.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next(); // Fail gracefully: if cache fails, proceed to DB
    }
  };
};

module.exports = {
  cacheMiddleware,
};
