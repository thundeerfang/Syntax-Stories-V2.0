#!/usr/bin/env bash
# Run the Flutter app on a physical Android device connected over USB (adb).
# Intended for side-by-side dev with ./scripts/run.sh ios in another terminal.
#
# Usage:
#   ./scripts/run_usb.sh
#   ./scripts/run_usb.sh --clean
#   ./scripts/run_usb.sh --no-reverse
#   ./scripts/run_usb.sh -- --release
#   ANDROID_SERIAL=R58M90ABCDE ./scripts/run_usb.sh
#
# Env:
#   ANDROID_SERIAL          Pick a specific adb device when multiple are plugged in
#   API_REVERSE_PORT=7373   Host port forwarded to the device via adb reverse
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_REVERSE_PORT="${API_REVERSE_PORT:-7373}"
CLEAN=false
SETUP_REVERSE=true
FLUTTER_ARGS=()

usage() {
  cat <<EOF
Usage: $0 [--clean] [--no-reverse] [-- flutter-run-args...]

  Runs flutter on a physical Android phone/tablet over USB debugging.
  Picks your Mac's LAN IP for API_BASE_URL so OAuth can open in the phone's browser.
  Also sets up \`adb reverse\` as a 127.0.0.1 fallback when needed.

Examples:
  $0
  $0 --clean
  $0 -- --dart-define=API_BASE_URL=http://192.168.1.42:$API_REVERSE_PORT
  ANDROID_SERIAL=R58M90ABCDE $0

Side-by-side with iOS:
  Terminal 1:  ./scripts/run.sh ios
  Terminal 2:  ./scripts/run_usb.sh

Prerequisites:
  - USB debugging enabled on the device
  - Device authorized (check \`adb devices\` shows "device", not "unauthorized")
  - Backend running: cd server && npm run dev
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --clean)
      CLEAN=true
      shift
      ;;
    --no-reverse)
      SETUP_REVERSE=false
      shift
      ;;
    --)
      shift
      FLUTTER_ARGS=("$@")
      break
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd adb
require_cmd flutter
require_cmd python3

list_physical_adb_devices() {
  adb devices -l 2>/dev/null | python3 -c "
import sys

rows = []
for line in sys.stdin:
    line = line.strip()
    if not line or line.startswith('List of devices'):
        continue
    parts = line.split()
    if len(parts) < 2:
        continue
    serial, state = parts[0], parts[1]
    if serial.startswith('emulator-'):
        continue
    model = ''
    for token in parts[2:]:
        if token.startswith('model:'):
            model = token.split(':', 1)[1].replace('_', ' ')
            break
    rows.append({'serial': serial, 'state': state, 'model': model or 'Android device'})

for r in rows:
    print(f\"{r['serial']}\t{r['state']}\t{r['model']}\")
" || true
}

flutter_physical_android_id() {
  local preferred_serial="${1:-}"
  flutter devices --machine 2>/dev/null | python3 -c "
import json, sys
preferred = '''$preferred_serial'''.strip()
devices = json.loads(sys.stdin.read() or '[]')
physical = [
    d for d in devices
    if 'android' in d.get('targetPlatform', '').lower() and not d.get('emulator')
]
if preferred:
    match = [d for d in physical if d.get('id') == preferred]
    if match:
        print(match[0]['id'])
        raise SystemExit(0)
print(physical[0]['id'] if physical else '')
" || true
}

describe_adb_devices() {
  adb devices -l 2>/dev/null | python3 -c "
import sys
for line in sys.stdin:
    line = line.strip()
    if not line or line.startswith('List of devices'):
        continue
    parts = line.split()
    if len(parts) < 2:
        continue
    serial, state = parts[0], parts[1]
    if serial.startswith('emulator-'):
        continue
    model = next((t.split(':', 1)[1] for t in parts[2:] if t.startswith('model:')), '')
    label = model.replace('_', ' ') if model else 'Android device'
    print(f'  {serial}  ({state})  {label}')
" || true
}

pick_usb_serial() {
  local preferred="${ANDROID_SERIAL:-}"
  local listing="$1"
  local -a online_serials=()
  local -a online_models=()
  local serial state model

  if [[ -z "$listing" ]]; then
    return 1
  fi

  while IFS=$'\t' read -r serial state model; do
    [[ -z "$serial" ]] && continue
    if [[ "$state" == "device" ]]; then
      online_serials+=("$serial")
      online_models+=("$model")
    fi
  done <<<"$listing"

  if [[ -n "$preferred" ]]; then
    local idx
    for idx in "${!online_serials[@]}"; do
      if [[ "${online_serials[$idx]}" == "$preferred" ]]; then
        printf '%s\n' "$preferred"
        return 0
      fi
    done
    echo "ANDROID_SERIAL=$preferred is not connected or not authorized." >&2
    describe_adb_devices >&2 || true
    exit 1
  fi

  if ((${#online_serials[@]} == 1)); then
    echo "==> Found USB device: ${online_models[0]} (${online_serials[0]})" >&2
    printf '%s\n' "${online_serials[0]}"
    return 0
  fi

  if ((${#online_serials[@]} > 1)); then
    echo "Multiple authorized USB Android devices found. Set ANDROID_SERIAL to one of:" >&2
    local idx
    for idx in "${!online_serials[@]}"; do
      echo "  ANDROID_SERIAL=${online_serials[$idx]}  # ${online_models[$idx]}" >&2
    done
    exit 1
  fi

  return 1
}

wait_for_usb_device() {
  local tries="${1:-60}" i listing unauthorized serial
  echo "==> Waiting for USB Android device..." >&2
  adb start-server >/dev/null 2>&1 || true
  for ((i = 1; i <= tries; i++)); do
    listing="$(list_physical_adb_devices)"
    serial="$(pick_usb_serial "$listing" 2>/dev/null || true)"
    if [[ -n "$serial" ]]; then
      printf '%s\n' "$serial"
      return 0
    fi

    unauthorized="$(printf '%s\n' "$listing" | awk -F '\t' '$2 == "unauthorized" { print $1; exit }')"
    if [[ -n "$unauthorized" ]]; then
      echo "    Device $unauthorized is unauthorized — accept the USB debugging prompt on the phone." >&2
    else
      echo "    No authorized USB device yet ($i/$tries)..." >&2
    fi
    sleep 2
  done

  echo "No physical Android device detected over USB." >&2
  echo "" >&2
  echo "Plug in the phone, enable Developer options → USB debugging, then authorize this Mac." >&2
  echo "Current adb devices:" >&2
  describe_adb_devices >&2 || adb devices >&2 || true
  exit 1
}

detect_lan_ip() {
  python3 -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
try:
    s.connect(('8.8.8.8', 80))
    print(s.getsockname()[0])
except OSError:
    pass
finally:
    s.close()
" 2>/dev/null || true
}

setup_api_reverse() {
  local serial="$1"
  echo "==> adb reverse tcp:$API_REVERSE_PORT tcp:$API_REVERSE_PORT (device → host API)"
  adb -s "$serial" reverse "tcp:$API_REVERSE_PORT" "tcp:$API_REVERSE_PORT" >/dev/null
}

flutter_args_include_api_base() {
  ((${#FLUTTER_ARGS[@]})) || return 1
  local arg
  for arg in "${FLUTTER_ARGS[@]}"; do
    if [[ "$arg" == API_BASE_URL=* || "$arg" == --dart-define=API_BASE_URL=* ]]; then
      return 0
    fi
  done
  return 1
}

prepare_project() {
  if [[ "$CLEAN" == true ]]; then
    echo "==> flutter clean"
    flutter clean
    echo "==> flutter pub upgrade"
    flutter pub upgrade
  fi
  echo "==> flutter pub get"
  flutter pub get
}

echo "==> Syntax Stories mobile — USB Android"
echo "    $ROOT"
echo ""

prepare_project

serial="$(wait_for_usb_device | tail -1 | tr -d '[:space:]')"

if [[ -z "$serial" ]]; then
  echo "Could not resolve a USB device serial."
  exit 1
fi

device_label="$(adb -s "$serial" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || true)"
if [[ -n "$device_label" ]]; then
  echo "==> Using USB device: $device_label ($serial)"
else
  echo "==> Using USB device: $serial"
fi

if ! flutter_args_include_api_base; then
  lan_ip="$(detect_lan_ip)"
  if [[ -n "$lan_ip" ]]; then
    FLUTTER_ARGS+=("--dart-define=API_BASE_URL=http://${lan_ip}:${API_REVERSE_PORT}")
    echo "==> API_BASE_URL=http://${lan_ip}:${API_REVERSE_PORT} (LAN — required for OAuth in phone browser)"
    echo "    Phone and Mac must be on the same Wi‑Fi (or routable network)."
    if [[ "$SETUP_REVERSE" == true ]]; then
      setup_api_reverse "$serial"
    fi
  elif [[ "$SETUP_REVERSE" == true ]]; then
    setup_api_reverse "$serial"
    FLUTTER_ARGS+=("--dart-define=API_BASE_URL=http://127.0.0.1:$API_REVERSE_PORT")
    echo "==> API_BASE_URL=http://127.0.0.1:$API_REVERSE_PORT (via adb reverse)"
  else
    echo "Could not detect a LAN IP and --no-reverse was passed. Set API_BASE_URL manually." >&2
    exit 1
  fi
elif [[ "$SETUP_REVERSE" == true ]]; then
  setup_api_reverse "$serial"
else
  echo "==> Skipping adb reverse (--no-reverse). Ensure API_BASE_URL reaches your dev machine."
fi

flutter_id="$(flutter_physical_android_id "$serial")"
run_id="${flutter_id:-$serial}"

echo "==> flutter run -d $run_id"
if ((${#FLUTTER_ARGS[@]})); then
  exec flutter run -d "$run_id" "${FLUTTER_ARGS[@]}"
else
  exec flutter run -d "$run_id"
fi
