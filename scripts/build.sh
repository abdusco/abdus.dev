#!/usr/bin/env bash
# Build the site into dist/, ready to deploy (scripts/deploy.sh syncs that directory).
set -euo pipefail

cd "$(dirname "$0")/.."

SITE_ENV=production kopkop build
python3 scripts/redirects.py

echo "built dist/ ($(find dist -type f | wc -l | tr -d ' ') files)"
