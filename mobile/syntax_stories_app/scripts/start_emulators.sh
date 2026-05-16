#!/usr/bin/env bash
# Start Android + iOS simulators for local Flutter runs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ANDROID_ID="${ANDROID_EMULATOR_ID:-Pixel_8_Pro}"

echo "==> Android: launching '$ANDROID_ID' (flutter emulators --launch)…"
flutter emulators --launch "$ANDROID_ID" &
ANDROID_PID=$!

echo "==> iOS: opening Simulator app…"
if ! open -a Simulator 2>/dev/null; then
  echo "    Could not open Simulator. Install Xcode from the App Store, then:"
  echo "      sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  wait "$ANDROID_PID" 2>/dev/null || true
  exit 1
fi

echo "==> Wait until both windows are up (iOS can take ~30s first boot)."
echo "    Then: cd \"$ROOT\" && flutter devices"
echo "    Run app: flutter run -d emulator-5554   # Android"
echo "             flutter run -d <ios-id>       # pick iPhone from flutter devices"

wait "$ANDROID_PID" 2>/dev/null || true
