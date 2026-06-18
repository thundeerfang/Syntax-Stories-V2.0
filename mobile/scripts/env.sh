#!/usr/bin/env bash
# Shared API dart-defines for Syntax Stories mobile builds.
#
# Usage (source from other scripts):
#   source "$(dirname "$0")/env.sh"
#   flutter build apk --release $(mobile_dart_defines production)
#
set -euo pipefail

PRODUCTION_API_URL="${PRODUCTION_API_URL:-https://syntax-stories-v2.onrender.com}"

# Prints dart-define flags for flutter build/run.
# Args: local | production
mobile_dart_defines() {
  local mode="${1:-production}"
  case "$mode" in
    local)
      printf '%s\n' '--dart-define=USE_LOCAL_API=true'
      ;;
    production|prod|release)
      printf '%s\n' "--dart-define=API_BASE_URL=${PRODUCTION_API_URL}"
      ;;
    *)
      echo "Unknown API mode: $mode (use local or production)" >&2
      return 1
      ;;
  esac
}

# Expand defines into an array: mobile_dart_defines_array production
mobile_dart_defines_array() {
  local mode="${1:-production}"
  local line
  while IFS= read -r line; do
    [[ -n "$line" ]] && printf '%s\n' "$line"
  done < <(mobile_dart_defines "$mode")
}
