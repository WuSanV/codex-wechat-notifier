import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export function resolvePaths(options = {}) {
  const home = options.home ?? process.env.CODEX_WECHAT_NOTIFIER_HOME ?? path.join(os.homedir(), ".codex-wechat-notifier");
  return {
    home,
    accountFile: path.join(home, "account.json"),
    logFile: path.join(home, "notifier.log"),
  };
}

export function readAccount(paths = resolvePaths()) {
  if (!existsSync(paths.accountFile)) return null;
  try {
    const value = JSON.parse(readFileSync(paths.accountFile, "utf8"));
    if (!value?.token || !value?.user_id) return null;
    return value;
  } catch {
    return null;
  }
}

export function isActivated(account) {
  return Boolean(account?.context_token && account?.to_user_id);
}

export function writeAccount(account, paths = resolvePaths()) {
  mkdirSync(paths.home, { recursive: true });
  const temp = `${paths.accountFile}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify({ ...account, saved_at: new Date().toISOString() }, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, paths.accountFile);
}

export function removeAccount(paths = resolvePaths()) {
  rmSync(paths.accountFile, { force: true });
}

export function appendLog(message, paths = resolvePaths()) {
  try {
    mkdirSync(paths.home, { recursive: true });
    const safe = String(message).replace(/[\r\n]+/gu, " ").slice(0, 1000);
    appendFileSync(paths.logFile, `${new Date().toISOString()} ${safe}\n`, { mode: 0o600 });
  } catch {
    // Notification errors must never interfere with Codex.
  }
}

export function maskId(value) {
  const text = String(value ?? "");
  if (text.length <= 7) return text;
  return `${text.slice(0, 3)}***${text.slice(-3)}`;
}
