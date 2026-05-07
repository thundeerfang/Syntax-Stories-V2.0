-- HASH-only §33 daily streak step (parity with applyDailyStreakTransition).
-- KEYS[1] = streak HASH (fields: lastDay, current, longest — all optional strings)
-- ARGV[1] = today, ARGV[2] = yesterday (UTC day buckets YYYY-MM-DD)

local streakKey = KEYS[1]
local today = ARGV[1]
local yesterday = ARGV[2]

local lastDay = redis.call('HGET', streakKey, 'lastDay')
local cur = tonumber(redis.call('HGET', streakKey, 'current')) or 0
local lng = tonumber(redis.call('HGET', streakKey, 'longest')) or 0

if lastDay == today then
  return { 0, cur, lng, today }
end

if (not lastDay) or (lastDay == '') then
  cur = 1
elseif lastDay == yesterday then
  cur = cur + 1
else
  cur = 1
end

lng = math.max(lng, cur)
redis.call('HSET', streakKey, 'current', cur, 'longest', lng, 'lastDay', today)
return { 1, cur, lng, today }
