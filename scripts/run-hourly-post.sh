#!/bin/zsh -l
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$ROOT/logs"
LOCK_DIR="$ROOT/state/hourly-post.lock"

mkdir -p "$LOGS" "$ROOT/state"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  printf '%s hourly post skipped: previous run still active\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" >> "$LOGS/hourly-post.log"
  exit 0
fi

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT

cd "$ROOT" || exit 1
printf '%s hourly post started\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" >> "$LOGS/hourly-post.log"
npm run post:send >> "$LOGS/hourly-post.log" 2>&1
status=$?
printf '%s hourly post finished status=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$status" >> "$LOGS/hourly-post.log"
exit "$status"
