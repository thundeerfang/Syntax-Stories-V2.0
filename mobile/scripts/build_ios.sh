#!/usr/bin/env bash
# Build iOS (simulator debug or device release) with production or local API.
#
# Usage:
#   ./scripts/build_ios.sh                    # release, production API (device)
#   ./scripts/build_ios.sh --simulator        # debug simulator build
#   ./scripts/build_ios.sh --local            # local API (127.0.0.1:7373)
#   ./scripts/build_ios.sh --clean --simulator
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=env.sh
source "$(dirname "$0")/env.sh"

OUT_DIR="$(cd "$ROOT/.." && pwd)/build/ios"
MODE="release"
TARGET="device"
API_MODE="production"
CLEAN=false
SIMULATOR=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --debug) MODE="debug"; shift ;;
    --release) MODE="release"; shift ;;
    --simulator) SIMULATOR=true; TARGET="simulator"; shift ;;
    --device) SIMULATOR=false; TARGET="device"; shift ;;
    --local) API_MODE="local"; shift ;;
    --production|--prod) API_MODE="production"; shift ;;
    --clean) CLEAN=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--clean] [--simulator|--device] [--local|--production] [--debug|--release]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

cd "$ROOT"
mkdir -p "$OUT_DIR"

if [[ "$CLEAN" == true ]]; then
  echo "==> flutter clean"
  flutter clean
fi

echo "==> flutter pub get"
flutter pub get

if [[ "$SIMULATOR" == true ]]; then
  echo "==> pod install (ios/)"
  (cd ios && pod install)
fi

DART_DEFINES=()
while IFS= read -r line; do
  [[ -n "$line" ]] && DART_DEFINES+=("$line")
done < <(mobile_dart_defines_array "$API_MODE")
echo "==> API mode: $API_MODE"

if [[ "$SIMULATOR" == true ]]; then
  echo "==> flutter build ios --simulator --${MODE}"
  flutter build ios --simulator --"${MODE}" "${DART_DEFINES[@]}"
  APP="$ROOT/build/ios/iphonesimulator/Runner.app"
  if [[ -d "$APP" ]]; then
    STAMP="$(date +%Y%m%d-%H%M)"
    DEST="$OUT_DIR/syntax-stories-simulator-${MODE}-${STAMP}.app"
    rm -rf "$DEST"
    cp -R "$APP" "$DEST"
    echo ""
    echo "==> iOS Simulator app ready"
    echo "    $DEST"
  fi
else
  echo "==> flutter build ios --${MODE} (requires Xcode signing)"
  flutter build ios --"${MODE}" "${DART_DEFINES[@]}"
  echo ""
  echo "==> iOS build complete — open Xcode to archive / export IPA if needed."
  echo "    $ROOT/build/ios/iphoneos/Runner.app"
fi
