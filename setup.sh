#!/usr/bin/env bash
# ördek-lab kurulum sarmalayıcı (Linux/macOS). Asıl iş setup.mjs'te.
# Kullanım:  ./setup.sh   ya da   ./setup.sh --mode class
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$DIR/setup.mjs" "$@"
