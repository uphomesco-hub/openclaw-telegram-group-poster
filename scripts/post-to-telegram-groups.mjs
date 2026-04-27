import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const messagePath = path.resolve(rootDir, args.message || "property-message.txt");
const groupsPath = path.resolve(rootDir, args.groups || "groups.txt");
const logsDir = path.join(rootDir, "logs", "post-runs");
const shouldSend = Boolean(args.send);
const shouldDraft = Boolean(args.draft);
const delayMs = Number(args.delayMs || 900);
const mode = shouldSend ? "send" : shouldDraft ? "draft" : "dry-run";
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const logPath = path.join(logsDir, `${runId}.jsonl`);
let failedAttempts = 0;

if (!existsSync(messagePath)) fail(`Message file not found: ${messagePath}`);
if (!existsSync(groupsPath)) fail(`Groups file not found: ${groupsPath}`);

const message = readFileSync(messagePath, "utf8").trim();
const groups = readFileSync(groupsPath, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

if (!message) fail("Message file is empty.");
if (groups.length === 0) fail("Groups file has no group names.");
if (shouldSend && shouldDraft) fail("Use only one of --send or --draft.");

console.log(`Groups: ${groups.length}`);
for (const group of groups) console.log(`- ${group}`);
console.log("");
console.log(shouldSend ? "Mode: SEND" : shouldDraft ? "Mode: DRAFT ONLY" : "Mode: DRY RUN");

if (!shouldSend && !shouldDraft) {
  console.log("\nNo Telegram actions performed. Use --draft to paste drafts or --send to post.");
  process.exit(0);
}

mkdirSync(logsDir, { recursive: true });
console.log(`Run log: ${logPath}`);
writeLog({
  event: "run-start",
  status: "started",
  messagePath,
  groupsPath,
  groupCount: groups.length,
});

const previousClipboard = getClipboard();
try {
  for (const [index, group] of groups.entries()) {
    console.log(`\n${index + 1}/${groups.length}: ${group}`);
    try {
      await openTelegramChat(group, delayMs);
      setClipboard(message);
      await pasteIntoTelegram(delayMs);

      if (shouldSend) {
        await pressReturn(delayMs);
        const note = "Posted or handed to Telegram. Slow mode cannot be confirmed from this Desktop UI automation; Telegram may keep it as a draft.";
        console.log(note);
        writeLog({ event: "group-attempt", status: "attempted", group, index: index + 1, note });
      } else {
        const note = "Draft pasted. Not sent.";
        console.log(note);
        writeLog({ event: "group-attempt", status: "attempted", group, index: index + 1, note });
      }
    } catch (error) {
      failedAttempts += 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed: ${errorMessage}`);
      writeLog({ event: "group-attempt", status: "failed", group, index: index + 1, error: errorMessage });
    }
  }
} finally {
  setClipboard(previousClipboard);
  writeLog({ event: "run-end", status: failedAttempts > 0 ? "finished-with-failures" : "finished", failedAttempts });
  console.log(`Run log saved: ${logPath}`);
  if (failedAttempts > 0) process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--send") parsed.send = true;
    else if (arg === "--draft") parsed.draft = true;
    else if (arg === "--message") parsed.message = argv[++i];
    else if (arg === "--groups") parsed.groups = argv[++i];
    else if (arg === "--delay-ms") parsed.delayMs = argv[++i];
    else fail(`Unknown argument: ${arg}`);
  }
  return parsed;
}

async function openTelegramChat(groupName, delay) {
  const telegramTarget = telegramResolveUrl(groupName);
  if (telegramTarget) {
    runAppleScript(`
      tell application "Telegram" to activate
      delay ${seconds(delay)}
    `);
    const result = spawnSync("open", [telegramTarget], { encoding: "utf8" });
    if (result.status !== 0) {
      fail(result.stderr.trim() || `Could not open ${telegramTarget}`);
    }
    await sleep(delay + 700);
    return;
  }

  setClipboard(groupName);
  runAppleScript(`
    tell application "Telegram" to activate
    delay ${seconds(delay)}
    tell application "System Events"
      keystroke "k" using command down
      delay ${seconds(delay)}
      keystroke "v" using command down
      delay ${seconds(delay)}
      key code 36
      delay ${seconds(delay + 300)}
    end tell
  `);
}

function telegramResolveUrl(value) {
  const trimmed = value.trim();
  const atMatch = trimmed.match(/^@([A-Za-z0-9_]{5,})$/);
  if (atMatch) return `tg://resolve?domain=${encodeURIComponent(atMatch[1])}`;

  const linkMatch = trimmed.match(/^https?:\/\/t\.me\/([A-Za-z0-9_]{5,})(?:\/.*)?$/i);
  if (linkMatch) return `tg://resolve?domain=${encodeURIComponent(linkMatch[1])}`;

  return "";
}

async function pasteIntoTelegram(delay) {
  runAppleScript(`
    tell application "System Events"
      keystroke "v" using command down
      delay ${seconds(delay)}
    end tell
  `);
}

async function pressReturn(delay) {
  runAppleScript(`
    tell application "System Events"
      key code 36
      delay ${seconds(delay)}
    end tell
  `);
}

function runAppleScript(script) {
  const result = spawnSync("osascript", ["-e", script], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "AppleScript failed.");
  }
}

function getClipboard() {
  const result = spawnSync("pbpaste", { encoding: "utf8" });
  return result.stdout || "";
}

function setClipboard(text) {
  const result = spawnSync("pbcopy", { input: text, encoding: "utf8" });
  if (result.status !== 0) throw new Error("Could not set clipboard.");
}

function seconds(ms) {
  return (ms / 1000).toFixed(2);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function writeLog(entry) {
  appendFileSync(
    logPath,
    JSON.stringify({
      runId,
      timestamp: new Date().toISOString(),
      mode,
      ...entry,
    }) + "\n",
  );
}
