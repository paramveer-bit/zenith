import Redis from "ioredis";

const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379")

export default client