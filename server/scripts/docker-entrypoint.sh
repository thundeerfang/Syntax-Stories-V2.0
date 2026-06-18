#!/bin/sh
set -eu

mkdir -p uploads/avatars uploads/covers uploads/media uploads/org-logos

wait_for_tcp() {
  host="$1"
  port="$2"
  label="$3"
  max="${4:-60}"

  i=0
  while [ "$i" -lt "$max" ]; do
    if node -e "
      const net = require('net');
      const s = net.createConnection({ host: process.argv[1], port: Number(process.argv[2]) });
      s.once('connect', () => { s.end(); process.exit(0); });
      s.once('error', () => process.exit(1));
    " "$host" "$port" 2>/dev/null; then
      echo "[entrypoint] ${label} ready at ${host}:${port}"
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  echo "[entrypoint] WARN: ${label} not reachable at ${host}:${port} — starting API anyway"
  return 0
}

if [ -n "${REDIS_URL:-}" ]; then
  redis_host="$(node -e "try{const u=new URL(process.env.REDIS_URL);console.log(u.hostname||'')}catch{console.log('')}")"
  redis_port="$(node -e "try{const u=new URL(process.env.REDIS_URL);console.log(u.port||'6379')}catch{console.log('6379')}")"
  if [ -n "$redis_host" ] && [ "$redis_host" != "127.0.0.1" ] && [ "$redis_host" != "localhost" ]; then
    wait_for_tcp "$redis_host" "$redis_port" "Redis" 30
  fi
fi

if [ -n "${CLAMAV_HOST:-}" ]; then
  wait_for_tcp "$CLAMAV_HOST" "${CLAMAV_PORT:-3310}" "ClamAV" 90
fi

exec "$@"
