#!/usr/bin/env bash
# Build Android APK + iOS with production API (Render).
#
# Usage:
#   ./scripts/build_release.sh              # Android release APK + iOS release
#   ./scripts/build_release.sh --apk-only
#   ./scripts/build_release.sh --ios-only --simulator
#   ./scripts/build_release.sh --local      # local API for both (dev builds)
#   ./scripts/build_release.sh --clean
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APK=true
IOS=true
CLEAN=false
API_MODE="production"
IOS_EXTRA=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apk-only) IOS=false; shift ;;
    --ios-only) APK=false; shift ;;
    --local) API_MODE="local"; shift ;;
    --production|--prod) API_MODE="production"; shift ;;
    --clean) CLEAN=true; shift ;;
    --simulator) IOS_EXTRA+=(--simulator); shift ;;
    -h|--help)
      echo "Usage: $0 [--clean] [--local|--production] [--apk-only|--ios-only] [--simulator]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

ARGS=()
[[ "$CLEAN" == true ]] && ARGS+=(--clean)
[[ "$API_MODE" == "local" ]] && ARGS+=(--local)

if [[ "$APK" == true ]]; then
  echo "========== Android APK ($API_MODE) =========="
  "$ROOT/scripts/build_apk.sh" --release "${ARGS[@]}"
fi

if [[ "$IOS" == true ]]; then
  echo ""
  echo "========== iOS ($API_MODE) =========="
  "$ROOT/scripts/build_ios.sh" --release "${ARGS[@]}" "${IOS_EXTRA[@]}"
fi

echo ""
echo "==> Done. Production API: https://syntax-stories-v2.onrender.com"
