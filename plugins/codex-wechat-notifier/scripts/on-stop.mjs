import { appendFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { IlinkClient } from "./lib/ilink.mjs";
import { appendLog, isActivated, readAccount, resolvePaths } from "./lib/state.mjs";

const MAX_RESULT_CHARS = 3200;

export function formatNotification(payload) {
  const cwd = String(payload?.cwd ?? "").trim();
  const project = cwd ? path.basename(cwd) : "未知目录";
  const model = String(payload?.model ?? "").trim();
  const result = String(payload?.last_assistant_message ?? "").trim() || "任务已结束，但没有最终文本。";
  const suffix = result.length > MAX_RESULT_CHARS ? "\n\n……（结果过长，已截断）" : "";
  const clipped = result.slice(0, MAX_RESULT_CHARS);
  return [
    "✅ Codex 任务完成",
    `项目：${project}`,
    model ? `模型：${model}` : null,
    "",
    clipped + suffix,
  ].filter((line) => line !== null).join("\n");
}

export async function handleStop(payload, options = {}) {
  if (payload?.hook_event_name !== "Stop") return { skipped: "wrong_event" };
  const paths = options.paths ?? resolvePaths();
  const account = options.account ?? readAccount(paths);
  if (!isActivated(account)) return { skipped: "not_activated" };
  const client = options.client ?? new IlinkClient({
    baseUrl: account.base_url,
    token: account.token,
    timeoutMs: 12_000,
  });
  await client.sendText({
    contextToken: account.context_token,
    text: formatNotification(payload),
    toUserId: account.to_user_id,
  });
  return { sent: true };
}

async function main() {
  const input = await readStdin();
  if (process.env.CODEX_WECHAT_HOOK_CAPTURE === "1") {
    const capture = path.join(resolvePaths().home, "hook-payload.jsonl");
    appendFileSync(capture, `${input.trim()}\n`, { mode: 0o600 });
  }
  try {
    const payload = input.trim() ? JSON.parse(input) : {};
    await handleStop(payload);
  } catch (error) {
    appendLog(`Stop notification failed: ${error.message}`);
  } finally {
    process.stdout.write("{}\n");
  }
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return chunks.join("");
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) await main();
