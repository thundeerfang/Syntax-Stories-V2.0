#!/usr/bin/env bash
# Boot iOS Simulator (if needed) and run the Flutter app on it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IOS_DEVICE_NAME="${IOS_SIMULATOR_DEVICE:-iPhone 16 Pro}"
FLUTTER_ARGS=("$@")

require_ios_runtime() {
  if xcrun simctl list runtimes 2>/dev/null | grep -q "iOS"; then
    return 0
  fi
  echo "No iOS Simulator runtime installed."
  echo "Install via Xcode (Settings → Platforms → iOS → Get) or:"
  echo "  xcodebuild -downloadPlatform iOS"
  exit 1
}

boot_simulator() {
  if ! open -a Simulator 2>/dev/null; then
    echo "Could not open Simulator. Install Xcode, then:"
    echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
    exit 1
  fi

  local device_id
  device_id="$(xcrun simctl list devices available 2>/dev/null \
    | grep -F "$IOS_DEVICE_NAME (" \
    | head -1 \
    | sed -E 's/^[[:space:]]*([A-F0-9-]+).*/\1/' || true)"

  if [[ -z "$device_id" ]]; then
    echo "Simulator device '$IOS_DEVICE_NAME' not found."
    echo "Available devices:"
    xcrun simctl list devices available 2>/dev/null | grep -E "iPhone|iPad" || true
    echo ""
    echo "Pick one and re-run, e.g.:"
    echo "  IOS_SIMULATOR_DEVICE='iPhone 16' $0"
    exit 1
  fi

  local state
  state="$(xcrun simctl list devices 2>/dev/null | grep "$device_id" | grep -oE '\([^)]+\)' | tail -1 | tr -d '()')"
  if [[ "$state" != "Booted" ]]; then
    echo "==> Booting $IOS_DEVICE_NAME ($device_id)…"
    xcrun simctl boot "$device_id" 2>/dev/null || true
    xcrun simctl bootstatus "$device_id" -b
  else
    echo "==> $IOS_DEVICE_NAME already booted."
  fi
}

wait_for_flutter_ios_device() {
  local tries="${1:-60}"
  local i device_id

  for ((i = 1; i <= tries; i++)); do
    device_id="$(flutter devices --machine 2>/dev/null | python3 -c "
import json, sys
devices = json.loads(sys.stdin.read() or '[]')
ios = [d for d in devices if 'ios' in d.get('targetPlatform', '').lower()]
print(ios[0]['id'] if ios else '')
" || true)"

    if [[ -n "$device_id" ]]; then
      echo "$device_id"
      return 0
    fi

    echo "    Waiting for iOS device in flutter devices ($i/$tries)…"
    sleep 2
  done

  echo "No iOS device detected by Flutter."
  echo "Run: flutter doctor -v"
  exit 1
}

echo "==> Checking iOS Simulator runtime…"
require_ios_runtime

echo "==> Ensuring dependencies…"
flutter pub get

echo "==> Starting Simulator…"
boot_simulator

echo "==> Resolving Flutter iOS device…"
IOS_ID="$(wait_for_flutter_ios_device)"

echo "==> Running app on $IOS_ID…"
exec flutter run -d "$IOS_ID" "${FLUTTER_ARGS[@]}"
