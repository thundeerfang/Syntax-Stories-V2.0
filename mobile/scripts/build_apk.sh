#!/usr/bin/env bash
# Build Android APK and copy to repo-root build/apk/
#
# Usage:
#   ./scripts/build_apk.sh           # release APK (default)
#   ./scripts/build_apk.sh --debug   # debug APK
#   ./scripts/build_apk.sh --clean   # flutter clean, then release
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=env.sh
source "$(dirname "$0")/env.sh"
OUT_DIR="$(cd "$ROOT/.." && pwd)/build/apk"
MODE="release"
CLEAN=false
API_MODE="production"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --debug) MODE="debug"; shift ;;
    --release) MODE="release"; shift ;;
    --clean) CLEAN=true; shift ;;
    --local) API_MODE="local"; shift ;;
    --production|--prod) API_MODE="production"; shift ;;
    -h|--help)
      echo "Usage: $0 [--clean] [--debug|--release] [--local|--production]"
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

DART_DEFINES=()
while IFS= read -r line; do
  [[ -n "$line" ]] && DART_DEFINES+=("$line")
done < <(mobile_dart_defines_array "$API_MODE")
echo "==> API mode: $API_MODE"

if [[ "$MODE" == "debug" ]]; then
  echo "==> flutter build apk --debug"
  flutter build apk --debug "${DART_DEFINES[@]}"
  SRC="$ROOT/build/app/outputs/flutter-apk/app-debug.apk"
  SUFFIX="debug"
else
  echo "==> flutter build apk --release"
  flutter build apk --release "${DART_DEFINES[@]}"
  SRC="$ROOT/build/app/outputs/flutter-apk/app-release.apk"
  SUFFIX="release"
fi

if [[ ! -f "$SRC" ]]; then
  echo "APK not found at: $SRC"
  exit 1
fi

VERSION="$(grep '^version:' pubspec.yaml | sed 's/version: *//' | tr -d ' ')"
STAMP="$(date +%Y%m%d-%H%M)"
DEST_NAME="syntax-stories-${VERSION}-${SUFFIX}-${STAMP}.apk"
LATEST_NAME="syntax-stories-${SUFFIX}-latest.apk"

cp "$SRC" "$OUT_DIR/$DEST_NAME"
cp "$SRC" "$OUT_DIR/$LATEST_NAME"

echo ""
echo "==> APK ready"
echo "    $OUT_DIR/$DEST_NAME"
echo "    $OUT_DIR/$LATEST_NAME"
ls -lh "$OUT_DIR/$LATEST_NAME"
