#!/usr/bin/env bash
# Syntax Stories mobile — one script for deps, compile, emulator boot, and run.
#
# Usage:
#   ./scripts/run.sh                 # Android + iOS (both)
#   ./scripts/run.sh android         # Android only
#   ./scripts/run.sh ios             # iOS only (default sim: iPhone 17)
#   ./scripts/run.sh --clean ios     # flutter clean + pod install, then iOS
#   ./scripts/run.sh --clean         # flutter clean, then both
#   ./scripts/run.sh ios -- --release
#
# Env:
#   ANDROID_EMULATOR_ID=Pixel_8_Pro_API35
#   IOS_SIMULATOR_DEVICE='iPhone 17'
#
set -euo pipefail

ROOT="$(cd "$(dirname "${0}")/.." && pwd)"
cd "${ROOT}"

ANDROID_EMULATOR_ID="${ANDROID_EMULATOR_ID:-Pixel_8_Pro_API35}"
IOS_SIMULATOR_DEVICE="${IOS_SIMULATOR_DEVICE:-iPhone 17}"
PLATFORM="both"
CLEAN=false
FLUTTER_ARGS=()
ANDROID_PID=""
IOS_PID=""

# Line-buffer flutter output so long steps (pod install, Xcode) stream live.
stream_prefix() {
  local label="$1"
  if command -v stdbuf >/dev/null 2>&1; then
    stdbuf -oL -eL sed "s/^/[${label}] /"
  else
    sed "s/^/[${label}] /"
  fi
}

usage() {
  cat <<EOF
Usage: $0 [--clean] [android|ios|both] [-- flutter-run-args...]

  android   Boot Android AVD (if needed), compile, and run
  ios       Boot iOS Simulator (if needed), compile, and run
  both      Build both, then run on Android + iOS (default)

Examples:
  $0
  $0 ios
  $0 --clean ios
  $0 --clean android
  $0 ios -- --dart-define=API_BASE_URL=http://127.0.0.1:7373

Env:
  IOS_SIMULATOR_DEVICE='iPhone 17'   Pick a different iOS simulator
  ANDROID_EMULATOR_ID=Pixel_8_Pro_API35
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
    android|ios|both)
      PLATFORM="$1"
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

cleanup() {
  [[ -n "${ANDROID_PID}" ]] && kill "${ANDROID_PID}" 2>/dev/null || true
  [[ -n "${IOS_PID}" ]] && kill "${IOS_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

android_device_id() {
  flutter devices --machine 2>/dev/null | python3 -c "
import json, sys
devices = json.loads(sys.stdin.read() or '[]')
android = [d for d in devices if d.get('emulator') and 'android' in d.get('targetPlatform', '').lower()]
print(android[0]['id'] if android else '')
" || true
}

ios_device_id() {
  local preferred_udid="${1:-}"
  flutter devices --machine 2>/dev/null | python3 -c "
import json, sys
preferred = '''${preferred_udid}'''.strip()
devices = json.loads(sys.stdin.read() or '[]')
ios = [d for d in devices if 'ios' in d.get('targetPlatform', '').lower()]
if preferred:
    match = [d for d in ios if d.get('id') == preferred]
    if match:
        print(match[0]['id'])
        raise SystemExit(0)
print(ios[0]['id'] if ios else '')
" || true
}

emulator_fully_booted() {
  local device_id="${1:-}"
  if [[ -z "${device_id}" ]]; then
    return 1
  fi
  local boot
  boot="$(adb -s "${device_id}" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
  [[ "${boot}" == "1" ]]
}

adb_device_online() {
  local device_id="$1"
  adb devices 2>/dev/null | awk -v id="${device_id}" '$1 == id && $2 == "device" { found = 1 } END { exit !found }'
}

# flutter emulators prints the table on stderr — parse ids from combined output.
resolve_android_avd_id() {
  local preferred="$1"
  flutter emulators 2>&1 | python3 -c "
import re, sys
preferred = '''${preferred}'''.strip()
ids = []
for line in sys.stdin:
    if 'android' not in line.lower():
        continue
    m = re.match(r'^(\S+)\s+•', line.strip())
    if m:
        ids.append(m.group(1))
if preferred and preferred in ids:
    print(preferred)
elif ids:
    print(ids[0])
" || true
}

pick_ios_simulator_id() {
  python3 -c "
import re, subprocess, sys

preferred = '''${IOS_SIMULATOR_DEVICE}'''.strip()

def parse_devices(section):
    rows = []
    for line in section.splitlines():
        m = re.match(r'^\s+(.+?)\s+\(([0-9A-F-]{36})\)\s+\(([^)]+)\)\s*$', line)
        if not m:
            continue
        rows.append({'name': m.group(1).strip(), 'udid': m.group(2), 'state': m.group(3).strip()})
    return rows

out = subprocess.check_output(['xcrun', 'simctl', 'list', 'devices'], text=True, stderr=subprocess.DEVNULL)
sections = out.split('--')
booted = []
available = []
for section in sections:
    for row in parse_devices(section):
        if row['state'] == 'Booted':
            booted.append(row)
        if row['state'] in ('Booted', 'Shutdown'):
            available.append(row)

def pick(rows):
    if preferred:
        exact = [r for r in rows if r['name'] == preferred]
        if exact:
            return exact[0]
        prefix = [r for r in rows if r['name'].startswith(preferred + ' ')]
        if prefix:
            return prefix[0]
    phones = [r for r in rows if r['name'].startswith('iPhone')]
    return phones[0] if phones else (rows[0] if rows else None)

row = pick(booted) or pick(available)
if not row:
    sys.exit(1)
print(row['udid'])
" 2>/dev/null || true
}

launch_android_if_needed() {
  local existing
  existing="$(android_device_id)"
  if [[ -n "${existing}" ]] && adb_device_online "${existing}" && emulator_fully_booted "${existing}"; then
    echo "==> Android emulator already running (${existing})." >&2
    return 0
  fi

  local avd_id
  avd_id="$(resolve_android_avd_id "${ANDROID_EMULATOR_ID}")"
  if [[ -z "${avd_id}" ]]; then
    echo "No Android emulator AVD found." >&2
    flutter emulators 2>&1 || true
    exit 1
  fi

  if [[ "${avd_id}" != "${ANDROID_EMULATOR_ID}" ]]; then
    echo "==> AVD '${ANDROID_EMULATOR_ID}' not found; using '${avd_id}'." >&2
    ANDROID_EMULATOR_ID="${avd_id}"
  fi

  echo "==> Launching Android emulator '${ANDROID_EMULATOR_ID}'..." >&2
  flutter emulators --launch "${ANDROID_EMULATOR_ID}" &
}

# Prints device id to stdout only; all logs go to stderr.
wait_for_android() {
  local tries="${1:-120}" i device_id
  echo "==> Waiting for Android emulator..." >&2
  adb start-server >/dev/null 2>&1 || true
  for ((i = 1; i <= tries; i++)); do
    device_id="$(android_device_id)"
    if [[ -n "${device_id}" ]] && adb_device_online "${device_id}" && emulator_fully_booted "${device_id}"; then
      printf '%s\n' "${device_id}"
      return 0
    fi
    adb wait-for-device >/dev/null 2>&1 || true
    echo "    Android booting (${i}/${tries})..." >&2
    sleep 2
  done
  echo "Android emulator not ready." >&2
  echo "    adb devices:" >&2
  adb devices >&2 || true
  exit 1
}

boot_ios_if_needed() {
  if ! open -a Simulator 2>/dev/null; then
    echo "Could not open Simulator. Install Xcode first." >&2
    exit 1
  fi

  local device_id state label
  device_id="$(pick_ios_simulator_id)"
  if [[ -z "${device_id}" ]]; then
    echo "No iOS simulator found for '${IOS_SIMULATOR_DEVICE}'." >&2
    xcrun simctl list devices available 2>/dev/null | grep -E 'iPhone|iPad' || true
    exit 1
  fi

  label="$(xcrun simctl list devices 2>/dev/null | grep "${device_id}" | sed -E 's/^[[:space:]]*([^(]+).*/\1/' | xargs)"
  state="$(xcrun simctl list devices 2>/dev/null | grep "${device_id}" | sed -E 's/.*\(([A-F0-9-]{36})\)[[:space:]]+\(([^)]+)\).*/\2/' | head -1)"
  if [[ "${state}" != "Booted" ]]; then
    echo "==> Booting ${label:-iOS simulator} (${device_id})..." >&2
    if ! xcrun simctl boot "${device_id}" 2>/dev/null; then
      xcrun simctl shutdown "${device_id}" 2>/dev/null || true
      sleep 1
      xcrun simctl boot "${device_id}"
    fi
    xcrun simctl bootstatus "${device_id}" -b
  else
    echo "==> ${label:-iOS simulator} already booted (${device_id})." >&2
  fi

  open -a Simulator --args -CurrentDeviceUDID "${device_id}" 2>/dev/null || true
  printf '%s\n' "${device_id}"
}

# Prints device id to stdout only; all logs go to stderr.
wait_for_ios() {
  local preferred_udid="${1:-}"
  local tries="${2:-90}" i device_id
  echo "==> Waiting for iOS device in Flutter..." >&2
  for ((i = 1; i <= tries; i++)); do
    device_id="$(ios_device_id "${preferred_udid}")"
    if [[ -n "${device_id}" ]]; then
      printf '%s\n' "${device_id}"
      return 0
    fi
    echo "    iOS registering (${i}/${tries})..." >&2
    sleep 2
  done
  echo "iOS device not detected by Flutter." >&2
  flutter devices >&2 || true
  exit 1
}

prepare_project() {
  echo "==> Syntax Stories mobile"
  echo "    ${ROOT}"
  echo ""
  if [[ "${CLEAN}" == true ]]; then
    echo "==> flutter clean"
    flutter clean
    echo "==> flutter pub upgrade"
    flutter pub upgrade
  fi
  echo "==> flutter pub get"
  flutter pub get
}

prepare_ios_pods() {
  if [[ ! -d "${ROOT}/ios" ]]; then
    return 0
  fi
  echo "==> pod install (ios/) — may take a minute after flutter clean..."
  (
    cd "${ROOT}/ios"
    if command -v pod >/dev/null 2>&1; then
      pod install
    else
      echo "    CocoaPods not in PATH; flutter run will run pod install." >&2
    fi
  )
}

run_flutter_on() {
  local label="$1"
  local device_id="$2"
  echo "==> flutter run -d ${device_id} (${label})"
  if ((${#FLUTTER_ARGS[@]})); then
    flutter run -d "${device_id}" "${FLUTTER_ARGS[@]}" 2>&1 | stream_prefix "${label}"
  else
    flutter run -d "${device_id}" 2>&1 | stream_prefix "${label}"
  fi
}

run_android() {
  launch_android_if_needed
  local id
  id="$(wait_for_android | tail -1 | tr -d '[:space:]')"
  run_flutter_on "android" "${id}"
}

run_ios() {
  if ! xcrun simctl list runtimes 2>/dev/null | grep -q "iOS"; then
    echo "No iOS Simulator runtime. Install via Xcode → Settings → Platforms."
    exit 1
  fi
  if [[ "${CLEAN}" == true ]]; then
    prepare_ios_pods
  fi
  local sim_udid
  sim_udid="$(boot_ios_if_needed | tail -1 | tr -d '[:space:]')"
  local id
  id="$(wait_for_ios "${sim_udid}" | tail -1 | tr -d '[:space:]')"
  run_flutter_on "ios" "${id}"
}

# Build both platforms first (one Flutter lock at a time), then run with prebuilt binaries.
run_both() {
  launch_android_if_needed &
  local android_launch_pid=$!

  local ios_boot_pid=""
  local ios_sim_udid="" ios_udid_file=""
  if xcrun simctl list runtimes 2>/dev/null | grep -q "iOS"; then
    ios_udid_file="$(mktemp "${TMPDIR:-/tmp}/syntax-stories-ios-udid.XXXXXX")"
    boot_ios_if_needed >"${ios_udid_file}" 2>/dev/null &
    ios_boot_pid=$!
  else
    echo "==> Skipping iOS (no Simulator runtime installed)." >&2
  fi

  wait "${android_launch_pid}" 2>/dev/null || true
  if [[ -n "${ios_boot_pid}" ]]; then
    wait "${ios_boot_pid}" 2>/dev/null || true
    if [[ -n "${ios_udid_file}" && -f "${ios_udid_file}" ]]; then
      ios_sim_udid="$(tail -1 "${ios_udid_file}" | tr -d '[:space:]')"
      rm -f "${ios_udid_file}"
    fi
  fi

  local android_id ios_id
  android_id="$(wait_for_android | tail -1 | tr -d '[:space:]')" || android_id=""
  ios_id=""
  if xcrun simctl list runtimes 2>/dev/null | grep -q "iOS"; then
    ios_id="$(wait_for_ios "${ios_sim_udid}" | tail -1 | tr -d '[:space:]')" || ios_id=""
  fi

  if [[ -z "${android_id}" && -z "${ios_id}" ]]; then
    echo "No Android or iOS device available." >&2
    exit 1
  fi

  local android_apk="${ROOT}/build/app/outputs/flutter-apk/app-debug.apk"
  local ios_app="${ROOT}/build/ios/iphonesimulator/Runner.app"

  if [[ -n "${android_id}" ]]; then
    echo "==> flutter build apk --debug"
    flutter build apk --debug
  fi

  if [[ -n "${ios_id}" ]]; then
    if [[ "${CLEAN}" == true ]]; then
      prepare_ios_pods
    fi
    echo "==> flutter build ios --simulator --debug"
    flutter build ios --simulator --debug
  fi

  if [[ -n "${android_id}" && -n "${ios_id}" ]]; then
    echo "==> Running on Android (${android_id}) and iOS (${ios_id}). Ctrl+C stops both." >&2
    if [[ -f "${android_apk}" ]]; then
      if ((${#FLUTTER_ARGS[@]})); then
        flutter run -d "${android_id}" --use-application-binary="${android_apk}" "${FLUTTER_ARGS[@]}" 2>&1 | stream_prefix "android" &
      else
        flutter run -d "${android_id}" --use-application-binary="${android_apk}" 2>&1 | stream_prefix "android" &
      fi
      ANDROID_PID=$!
      sleep 3
    fi
    if [[ -d "${ios_app}" ]]; then
      if ((${#FLUTTER_ARGS[@]})); then
        flutter run -d "${ios_id}" --use-application-binary="${ios_app}" "${FLUTTER_ARGS[@]}" 2>&1 | stream_prefix "ios" &
      else
        flutter run -d "${ios_id}" --use-application-binary="${ios_app}" 2>&1 | stream_prefix "ios" &
      fi
      IOS_PID=$!
    fi
    if [[ -n "${ANDROID_PID}${IOS_PID}" ]]; then
      [[ -n "${ANDROID_PID}" ]] && wait "${ANDROID_PID}" || true
      [[ -n "${IOS_PID}" ]] && wait "${IOS_PID}" || true
    fi
    return
  fi

  if [[ -n "${android_id}" ]]; then
    if [[ -f "${android_apk}" ]]; then
      if ((${#FLUTTER_ARGS[@]})); then
        exec flutter run -d "${android_id}" --use-application-binary="${android_apk}" "${FLUTTER_ARGS[@]}"
      else
        exec flutter run -d "${android_id}" --use-application-binary="${android_apk}"
      fi
    fi
    run_flutter_on "android" "${android_id}"
    return
  fi

  if [[ -d "${ios_app}" ]]; then
    if ((${#FLUTTER_ARGS[@]})); then
      exec flutter run -d "${ios_id}" --use-application-binary="${ios_app}" "${FLUTTER_ARGS[@]}"
    else
      exec flutter run -d "${ios_id}" --use-application-binary="${ios_app}"
    fi
  fi
  run_flutter_on "ios" "${ios_id}"
}

prepare_project

case "${PLATFORM}" in
  android) run_android ;;
  ios) run_ios ;;
  both) run_both ;;
  *)
    echo "Unknown platform: ${PLATFORM}"
    usage
    exit 1
    ;;
esac
