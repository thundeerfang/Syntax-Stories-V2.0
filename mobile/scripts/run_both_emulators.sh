#!/usr/bin/env bash
# Prints exact commands to run Syntax Stories on Android + iOS (use two terminals for hot reload).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

{
  read -r ANDROID_ID
  read -r IOS_ID
} < <(flutter devices --machine | python3 -c "
import json, sys
raw = sys.stdin.read()
devices = json.loads(raw) if raw.strip() else []
android = next((x['id'] for x in devices if x.get('emulator') and 'android' in x.get('targetPlatform', '')), None)
ios = next((x['id'] for x in devices if 'ios' in x.get('targetPlatform', '').lower()), None)
print(android or '')
print(ios or '')
")

echo ""
if [[ -z "$ANDROID_ID" ]]; then
  echo "No Android emulator found. Start one: flutter emulators --launch <id>"
else
  echo "── Terminal 1 — Android ─────────────────────────────────────"
  echo "cd \"$ROOT\" && flutter run -d $ANDROID_ID"
fi
echo ""
if [[ -z "$IOS_ID" ]]; then
  echo "No iOS Simulator found. Open Simulator, wait for boot, then re-run this script."
else
  echo "── Terminal 2 — iOS ─────────────────────────────────────────"
  echo "cd \"$ROOT\" && flutter run -d $IOS_ID"
fi
echo ""
