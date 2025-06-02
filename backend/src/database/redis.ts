// src/database/redis.ts
import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;

async function connectRedis(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient; // Return existing client if already connected
  }

  try {
    redisClient = createClient({
      url: "redis://default:gOIKv9lwc3JF0cORU1RqERrM1k9FGrkd@redis-18249.c330.asia-south1-1.gce.redns.redis-cloud.com:18249",
    });

    redisClient.on("error", (err) => console.log("Redis Client Error", err));

    await redisClient.connect();
    console.log("Connected to Redis!");
    return redisClient;
  } catch (error) {
    console.error("Failed to connect to Redis", error);
    throw error;
  }
}

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (!redisClient?.isReady) {
    return await connectRedis();
  }
  return redisClient;
};
