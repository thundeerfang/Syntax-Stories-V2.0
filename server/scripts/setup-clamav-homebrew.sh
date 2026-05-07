#!/usr/bin/env bash
# One-time / idempotent ClamAV setup for macOS (Homebrew).
# Creates clamd.conf + freshclam.conf, downloads virus DBs, starts the LaunchAgent.
# Requires: brew install clamav
set -euo pipefail

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew not found. Install from https://brew.sh" >&2
  exit 1
fi

PREFIX="$(brew --prefix)"
CLAM_ETC="${PREFIX}/etc/clamav"
CLAM_VAR="${PREFIX}/var/lib/clamav"
CLAM_OPT="${PREFIX}/opt/clamav"
CLAMD_CONF="${CLAM_ETC}/clamd.conf"
FRESH_CONF="${CLAM_ETC}/freshclam.conf"

mkdir -p "${CLAM_VAR}"

if [[ ! -f "${CLAM_OPT}/sbin/clamd" ]]; then
  echo "ClamAV not installed. Run: brew install clamav" >&2
  exit 1
fi

if [[ ! -f "${CLAMD_CONF}" ]]; then
  cp "${CLAM_ETC}/clamd.conf.sample" "${CLAMD_CONF}"
  sed -i '' '/^Example$/d' "${CLAMD_CONF}"
  sed -i '' 's/^#TCPSocket 3310$/TCPSocket 3310/' "${CLAMD_CONF}"
  sed -i '' 's/^#TCPAddr localhost$/TCPAddr 127.0.0.1/' "${CLAMD_CONF}"
  if ! grep -q '^DatabaseDirectory' "${CLAMD_CONF}"; then
    sed -i '' "1a\\
DatabaseDirectory ${CLAM_VAR}
" "${CLAMD_CONF}"
  fi
  echo "Created ${CLAMD_CONF}"
else
  echo "Using existing ${CLAMD_CONF}"
fi

if [[ ! -f "${FRESH_CONF}" ]]; then
  cp "${CLAM_ETC}/freshclam.conf.sample" "${FRESH_CONF}"
  sed -i '' '/^Example$/d' "${FRESH_CONF}"
  sed -i '' "s|^#DatabaseDirectory /var/lib/clamav|DatabaseDirectory ${CLAM_VAR}|" "${FRESH_CONF}"
  echo "Created ${FRESH_CONF}"
else
  echo "Using existing ${FRESH_CONF}"
fi

echo "Updating virus definitions (freshclam)..."
"${CLAM_OPT}/bin/freshclam" --config-file="${FRESH_CONF}"

echo "Starting clamd via Homebrew services (listens on 127.0.0.1:3310)..."
brew services start clamav || true

echo ""
echo "Add to server/.env:"
echo "  CLAMAV_HOST=127.0.0.1"
echo "  CLAMAV_PORT=3310"
echo ""
echo "Optional: CLAMAV_REQUIRED=true to reject uploads when clamd is down."
echo "Check: nc -z 127.0.0.1 3310 && echo OK"
