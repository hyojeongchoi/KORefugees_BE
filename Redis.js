// Redis 연결
const redis = require('redis');

const redisClient = redis.createClient(process.env.REDIS_PORT);
redisClient.on('connect', () => console.log('Connected to Redis!'));
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

module.exports = redisClient