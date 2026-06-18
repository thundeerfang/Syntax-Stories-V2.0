#!/usr/bin/env bash
# Render build — install dev deps (tsc + @types) and compile dist/.
#
# Set in Render dashboard → Build Command:
#   bash scripts/render-build.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Render build (NPM_CONFIG_PRODUCTION=false)"
export NPM_CONFIG_PRODUCTION=false

echo "==> npm install"
npm install

echo "==> npm run build"
npm run build

echo "==> Build OK"
