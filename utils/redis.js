const redis = require("redis");

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  legacyMode: true,
});

redisClient.connect().catch(console.error);

module.exports = redisClient;
