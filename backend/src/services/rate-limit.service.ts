import { env } from "../config/env.js";
import { redis } from "../redis/redis.js";

const reserveScript = `
local count = tonumber(redis.call("GET", KEYS[1]) or "0")
local limit = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local windowEnd = tonumber(ARGV[3])
local minDelay = tonumber(ARGV[4])

if count >= limit then
  return windowEnd
end

local nextAllowed = tonumber(redis.call("GET", KEYS[2]) or "0")
if nextAllowed > now then
  return nextAllowed
end

local newCount = redis.call("INCR", KEYS[1])
if newCount == 1 then
  redis.call("PEXPIREAT", KEYS[1], windowEnd + 60000)
end

local reservedUntil = now + minDelay
redis.call("SET", KEYS[2], reservedUntil, "PX", math.max(minDelay + 60000, 60000))
return 0
`;

function utcHourKey(date: Date): string {
  return date.toISOString().slice(0, 13);
}

function nextUtcHour(date: Date): number {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next.getTime();
}

export async function reserveSendSlot(input: {
  senderId: string;
  campaignHourlyLimit: number;
  campaignDelayMs: number;
  now?: Date;
}): Promise<{ allowed: true } | { allowed: false; retryAt: Date }> {
  const now = input.now ?? new Date();
  const hourlyLimit = Math.min(input.campaignHourlyLimit, env.MAX_EMAILS_PER_HOUR);
  const minDelayMs = Math.max(input.campaignDelayMs, env.MIN_EMAIL_DELAY_MS);
  const hourEnd = nextUtcHour(now);
  const result = await redis.eval(
    reserveScript,
    2,
    `email-rate:${input.senderId}:${utcHourKey(now)}`,
    `email-spacing:${input.senderId}`,
    hourlyLimit,
    now.getTime(),
    hourEnd,
    minDelayMs,
  );

  const retryTimestamp = Number(result);
  return retryTimestamp === 0
    ? { allowed: true }
    : { allowed: false, retryAt: new Date(retryTimestamp) };
}
