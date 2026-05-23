#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$REPO_ROOT"

VERSION=$(node -p "require('./plugin.json').version")
PACKAGE_NAME="qwenpaw-remote-plugin-$VERSION"
DIST_ROOT="$REPO_ROOT/dist"
STAGING="$DIST_ROOT/$PACKAGE_NAME"
ZIP_PATH="$DIST_ROOT/$PACKAGE_NAME.zip"

SKIP_INSTALL=0
if [ "${1:-}" = "--skip-install" ]; then
  SKIP_INSTALL=1
fi

if [ "$SKIP_INSTALL" -eq 0 ]; then
  npm --prefix ui ci
fi
npm --prefix ui run build

rm -rf "$DIST_ROOT"
mkdir -p "$STAGING"

cp plugin.json plugin.py requirements.txt context.py ssh_manager.py shell_wrapper.py store.py README.md LICENSE "$STAGING/"
cp -R routers tools "$STAGING/"

mkdir -p "$STAGING/ui/dist"
cp "ui/dist/index.js" "$STAGING/ui/dist/index.js"

find "$STAGING" -type d -name "__pycache__" -prune -exec rm -rf {} +
find "$STAGING" -type f \( -name "*.pyc" -o -name "*.pyo" \) -delete

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN=python3
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN=python
else
  echo "python3 or python is required to create the ZIP file." >&2
  exit 1
fi

"$PYTHON_BIN" - "$STAGING" "$ZIP_PATH" <<'PY'
import os
import sys
import zipfile

staging, zip_path = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk(staging):
        for name in files:
            path = os.path.join(root, name)
            arcname = os.path.relpath(path, staging)
            zf.write(path, arcname)
PY

echo "Created $ZIP_PATH"
