const script = `-- KEYS[1] = rate key (e.g., rate:user123)
-- ARGV[1] = capacity
-- ARGV[2] = refill_rate (tokens per second)
-- ARGV[3] = current_time (in milliseconds)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Fetch stored data
local data = redis.call("HMGET", key, "tokens", "last_refill_ts")
local tokens = tonumber(data[1])
local last_refill_ts = tonumber(data[2])

-- First request
if tokens == nil then
  tokens = capacity
  last_refill_ts = now
end

-- Refill logic
local delta = math.max(0, now - last_refill_ts)
local refill_tokens = math.floor(delta * refill_rate / 1000)
tokens = math.min(capacity, tokens + refill_tokens)
last_refill_ts = now

local allowed = 0
if tokens > 0 then
  tokens = tokens - 1
  allowed = 1
end

-- Save state
redis.call("HMSET", key, "tokens", tokens, "last_refill_ts", last_refill_ts)
redis.call("PEXPIRE", key, 60000) -- Optional: auto-expire after 1 min

return allowed
`

export default script;