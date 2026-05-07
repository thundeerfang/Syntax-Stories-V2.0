-- Merged VIEW_COMMIT (BLOG_READ_STREAK.md F.1): session + streak HASH + readDays ZSET + ack + DEL session.
-- KEYS[1] session, KEYS[2] streak HASH, KEYS[3] readDays ZSET, KEYS[4] ack key
-- ARGV: today, yesterday, zsetScoreMs, trimMinScoreStr, lastUpdatedMs, userId, postId, ackTtlSeconds

local sk = KEYS[1]
local streakKey = KEYS[2]
local zkey = KEYS[3]
local ackKey = KEYS[4]

local today = ARGV[1]
local yesterday = ARGV[2]
local score = tonumber(ARGV[3])
local trimMinStr = ARGV[4]
local lastUp = ARGV[5]
local uid = ARGV[6]
local pid = ARGV[7]
local ackTtl = tonumber(ARGV[8])

local function readStreak()
  local lastDay = redis.call('HGET', streakKey, 'lastDay')
  local cur = tonumber(redis.call('HGET', streakKey, 'current')) or 0
  local lng = tonumber(redis.call('HGET', streakKey, 'longest')) or 0
  return lastDay, cur, lng
end

if redis.call('EXISTS', ackKey) == 1 then
  local lastDay, cur, lng = readStreak()
  return { 2, cur, lng, lastDay or today }
end

if redis.call('EXISTS', sk) == 0 then
  return { -1, 0, 0, '' }
end

local u = redis.call('HGET', sk, 'userId')
local p = redis.call('HGET', sk, 'postId')
if (not u) or (not p) or u ~= uid or p ~= pid then
  return { -1, 0, 0, '' }
end

local ld0, _, _ = readStreak()
if ld0 and ld0 ~= '' and today < ld0 then
  return { -3, 0, 0, ld0 }
end

redis.call('ZADD', zkey, score, today)
redis.call('ZREMRANGEBYSCORE', zkey, '-inf', '(' .. trimMinStr)

local lastDay, cur, lng = readStreak()
local applied = 1

if lastDay == today then
  applied = 0
else
  if (not lastDay) or (lastDay == '') then
    cur = 1
  elseif lastDay == yesterday then
    cur = cur + 1
  else
    cur = 1
  end
  if cur > lng then lng = cur end
  redis.call('HSET', streakKey,
    'current', cur,
    'longest', lng,
    'lastDay', today,
    'lastUpdated', lastUp
  )
end

if applied == 0 then
  redis.call('HSET', streakKey, 'lastUpdated', lastUp)
end

redis.call('SET', ackKey, '1', 'EX', ackTtl)
redis.call('DEL', sk)
return { applied, cur, lng, today }
