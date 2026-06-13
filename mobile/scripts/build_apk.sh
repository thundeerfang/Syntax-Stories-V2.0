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
OUT_DIR="$(cd "$ROOT/.." && pwd)/build/apk"
MODE="release"
CLEAN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --debug) MODE="debug"; shift ;;
    --release) MODE="release"; shift ;;
    --clean) CLEAN=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--clean] [--debug|--release]"
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

if [[ "$MODE" == "debug" ]]; then
  echo "==> flutter build apk --debug"
  flutter build apk --debug
  SRC="$ROOT/build/app/outputs/flutter-apk/app-debug.apk"
  SUFFIX="debug"
else
  echo "==> flutter build apk --release"
  flutter build apk --release
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
