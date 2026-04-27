# Telegram Desktop Group Poster

A small macOS automation script that uses Telegram Desktop to paste one message into a list of Telegram groups or channels.

It is intentionally simple: it controls the Telegram Desktop app with AppleScript/System Events. It does not use Telegram bot APIs and it cannot bypass Telegram slow mode.

## Requirements

- macOS
- Telegram Desktop installed, open, and logged in
- Node.js 20 or newer
- Accessibility permission for your terminal app so it can control Telegram

## Setup

Clone the repo, then create your local config files from the examples:

```sh
cp groups.example.txt groups.txt
cp property-message.example.txt property-message.txt
```

Edit `groups.txt` and put one Telegram target per line:

```text
@example_group_one
@example_group_two
https://t.me/example_group_three
```

Edit `property-message.txt` and put the exact message you want to send:

```text
Your message goes here.
It can have multiple lines.
```

`groups.txt` and `property-message.txt` are ignored by Git so your private groups and message text do not get committed.

## Run

Dry run, no Telegram action:

```sh
npm run post:dry-run
```

Paste drafts into each group without pressing Send:

```sh
npm run post:draft
```

Post to every group in `groups.txt`:

```sh
npm run post:send
```

## Logs

Every send or draft run writes a JSONL file under:

```sh
logs/post-runs/
```

The scheduler wrapper writes to:

```sh
logs/hourly-post.log
logs/launchd-hourly.out.log
logs/launchd-hourly.err.log
```

Slow mode cannot be confirmed from Telegram Desktop UI automation. Slow-mode groups are logged as `attempted`; Telegram may keep the pasted message as a draft with its normal countdown.

## Hourly Posting

To install a quiet hourly macOS LaunchAgent from this repo folder:

```sh
chmod +x scripts/install-hourly-launchagent.sh scripts/run-hourly-post.sh
scripts/install-hourly-launchagent.sh
```

By default it installs the label:

```text
com.local.telegram-hourly-poster
```

You can pass a custom label:

```sh
scripts/install-hourly-launchagent.sh com.yourname.telegram-hourly-poster
```

The job runs once every 3600 seconds while the Mac is awake and the user session is active. It does not notify chat; check the log files above.

To inspect it:

```sh
launchctl print gui/$(id -u)/com.local.telegram-hourly-poster
```

To uninstall it:

```sh
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.local.telegram-hourly-poster.plist
rm ~/Library/LaunchAgents/com.local.telegram-hourly-poster.plist
```

## Changing Groups Or Message

To change groups, edit:

```sh
groups.txt
```

To change the message, edit:

```sh
property-message.txt
```

Then run:

```sh
npm run post:dry-run
npm run post:send
```

The hourly scheduler reads those same two files each time it runs, so changes apply to the next scheduled run.

## Notes

- Keep group names exact enough that Telegram opens the intended chat.
- Public `@username` groups and `https://t.me/...` links are the most reliable.
- Do not spam groups. Respect Telegram rules and group-specific posting limits.
