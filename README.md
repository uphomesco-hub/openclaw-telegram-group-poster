# OpenClaw Telegram Group Poster Add-on

An OpenClaw-friendly macOS add-on for posting a prepared message to Telegram groups through Telegram Desktop, with optional hourly scheduling through `launchd`.

This repo is self-contained. Users add it to their OpenClaw setup, configure local Telegram Desktop group targets, and let OpenClaw or `launchd` run the provided npm scripts. It does not use Telegram bot APIs, does not require Telegram API tokens, and cannot bypass Telegram slow mode.

## What It Does

- Opens Telegram Desktop group targets from `groups.txt`.
- Pastes the message from `property-message.txt`.
- Can run as a dry run, draft-only paste, or real send.
- Writes run logs under `logs/`.
- Can install a macOS LaunchAgent for recurring scheduled posting.

## Requirements

- macOS
- OpenClaw, when you want to run this as an OpenClaw add-on
- Telegram Desktop installed, open, and logged in
- Node.js 20 or newer
- Accessibility permission for your terminal app or OpenClaw runner so it can control Telegram Desktop

## Add To OpenClaw

Clone or add this repository as a local OpenClaw add-on/workspace:

```sh
git clone https://github.com/uphomesco-hub/openclaw-telegram-group-poster.git
cd openclaw-telegram-group-poster
npm install
```

Then expose the package scripts to OpenClaw as local commands:

```sh
npm run post:dry-run
npm run post:draft
npm run post:send
```

Use `post:dry-run` first so OpenClaw can confirm the configured target list without opening Telegram or sending anything.

## Configure Telegram Targets

Create local config files from the examples:

```sh
cp groups.example.txt groups.txt
cp property-message.example.txt property-message.txt
```

Edit `groups.txt` and put one Telegram group or channel target per line:

```text
@example_group_one
@example_group_two
https://t.me/example_group_three
```

Public `@username` targets and `https://t.me/...` links are the most reliable. Plain group names can work through Telegram Desktop search, but they depend on the exact local Telegram UI result.

Edit `property-message.txt` and put the exact message to post:

```text
Your message goes here.
It can have multiple lines.
```

`groups.txt` and `property-message.txt` are ignored by Git. Keep real group targets, private copy, account details, and operational notes out of committed files. The checked-in `*.example.txt` files should stay generic and safe.

## Run Posting Commands

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

For OpenClaw workflows, use the same commands. Treat `post:send` as the only command that actually presses Send in Telegram Desktop.

## Schedule With launchd

Install the hourly LaunchAgent from this repo folder:

```sh
chmod +x scripts/install-hourly-launchagent.sh scripts/run-hourly-post.sh
scripts/install-hourly-launchagent.sh
```

By default it installs this label:

```text
com.openclaw.telegram-group-poster
```

You can pass a custom label:

```sh
scripts/install-hourly-launchagent.sh com.yourname.telegram-group-poster
```

The job runs once every 3600 seconds while the Mac is awake and the user session is active. It calls:

```sh
npm run post:send
```

Inspect the default job:

```sh
launchctl print gui/$(id -u)/com.openclaw.telegram-group-poster
```

Uninstall the default job:

```sh
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.openclaw.telegram-group-poster.plist
rm ~/Library/LaunchAgents/com.openclaw.telegram-group-poster.plist
```

## Logs

Every send or draft run writes JSONL records under:

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

## Changing Groups Or Message

To change groups, edit:

```sh
groups.txt
```

To change the message, edit:

```sh
property-message.txt
```

Then verify and send:

```sh
npm run post:dry-run
npm run post:send
```

The hourly scheduler reads those same two files each time it runs, so changes apply to the next scheduled run.

## Safety Notes

- Keep group names exact enough that Telegram opens the intended chat.
- Do not commit `groups.txt`, `property-message.txt`, logs, state files, screenshots, session data, or account-specific notes.
- Do not point this add-on at another local automation folder. Keep this repo's config and launchd job self-contained.
- Respect Telegram rules, group-specific posting limits, and local laws.
