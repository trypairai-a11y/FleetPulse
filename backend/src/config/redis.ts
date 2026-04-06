import Redis from "ioredis";
import { env } from "./env";

let redis: Redis | null = null;

try {
  if (env.REDIS_URL && env.REDIS_URL !== "redis://localhost:6379") {
    redis = new Redis(env.REDIS_URL);
    redis.on("error", (err) => {
      console.error("Redis connection error:", err);
    });
    redis.on("connect", () => {
      console.log("Connected to Redis");
    });
  } else {
    console.log("Redis not configured, running without cache");
  }
} catch {
  console.log("Redis unavailable, running without cache");
}

export default redis;
