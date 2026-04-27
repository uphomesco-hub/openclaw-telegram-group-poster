#!/bin/zsh -l
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="${1:-com.openclaw.telegram-group-poster}"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

mkdir -p "$HOME/Library/LaunchAgents" "$ROOT/logs" "$ROOT/state"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>

  <key>ProgramArguments</key>
  <array>
    <string>$ROOT/scripts/run-hourly-post.sh</string>
  </array>

  <key>StartInterval</key>
  <integer>3600</integer>

  <key>RunAtLoad</key>
  <false/>

  <key>StandardOutPath</key>
  <string>$ROOT/logs/launchd-hourly.out.log</string>

  <key>StandardErrorPath</key>
  <string>$ROOT/logs/launchd-hourly.err.log</string>
</dict>
</plist>
PLIST

chmod 644 "$PLIST"
plutil -lint "$PLIST"
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl print "gui/$(id -u)/$LABEL" | sed -n '1,80p'

echo "Installed hourly LaunchAgent: $PLIST"
