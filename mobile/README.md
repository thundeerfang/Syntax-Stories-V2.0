# Syntax Stories — Flutter mobile app

## API environments

| Mode | How | API URL |
|------|-----|---------|
| **Production** (default) | Release builds, or run without `--local` | `https://syntax-stories-v2.onrender.com` |
| **Local dev** | `./scripts/run.sh --local ios` | `127.0.0.1:7373` (iOS sim) / `10.0.2.2:7373` (Android emu) |

On launch, the app shows a **Connecting to server** screen and polls `GET /api/health` until the API responds (Render free tier can take ~1 minute to wake up).

### Local development

1. Start the backend:

```bash
cd server
npm run dev
```

2. Run the app against localhost:

```bash
cd mobile
./scripts/run.sh --local ios          # iOS Simulator
./scripts/run_usb.sh                  # physical Android (sets LAN/reverse automatically)
```

Side-by-side (two terminals):

```bash
# Terminal 1
./scripts/run.sh --local ios

# Terminal 2 — phone plugged in, USB debugging on
./scripts/run_usb.sh
```

Override explicitly if needed:

```bash
./scripts/run.sh --local ios
./scripts/run_usb.sh -- --dart-define=API_BASE_URL=http://192.168.1.42:7373
```

After changing widget state classes, use **hot restart** (`R`), not hot reload (`r`).

## Release builds (production API)

```bash
cd mobile

# Android release APK → ../build/apk/
./scripts/build_apk.sh --release

# iOS release (Xcode signing required)
./scripts/build_ios.sh --release

# Both platforms
./scripts/build_release.sh --clean
```

Simulator iOS build with production API:

```bash
./scripts/build_release.sh --ios-only --simulator
```

Local API test builds:

```bash
./scripts/build_release.sh --local --apk-only
```
