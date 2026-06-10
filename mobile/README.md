# Syntax Stories — Flutter mobile app

## Local API

The app defaults to **`http://127.0.0.1:7373`** (same as the project server).

1. Start the backend:

```bash
cd server
npm run dev
```

2. Run the app:

```bash
cd mobile
./scripts/run.sh ios          # iOS Simulator
./scripts/run_usb.sh          # physical Android over USB
```

Side-by-side (two terminals):

```bash
# Terminal 1
./scripts/run.sh ios

# Terminal 2 — phone plugged in, USB debugging on
./scripts/run_usb.sh
```

`run_usb.sh` sets up `adb reverse` so a physical device can use `http://127.0.0.1:7373` for the local API (emulator `10.0.2.2` does not apply on real hardware).

Override the API URL if needed:

```bash
./scripts/run.sh ios -- --dart-define=API_BASE_URL=http://127.0.0.1:7373
./scripts/run_usb.sh -- --dart-define=API_BASE_URL=http://192.168.1.42:7373
```

After changing widget state classes, use **hot restart** (`R`), not hot reload (`r`).
