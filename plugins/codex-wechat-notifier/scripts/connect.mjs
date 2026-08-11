#!/usr/bin/env node
import { spawn } from "node:child_process";
import { IlinkClient, activationRoute, fetchLoginQr, waitForLogin } from "./lib/ilink.mjs";
import { isActivated, maskId, readAccount, removeAccount, resolvePaths, writeAccount } from "./lib/state.mjs";

const action = process.argv[2] ?? "status";
const paths = resolvePaths();

try {
  if (action === "bind") await bind();
  else if (action === "status") status();
  else if (action === "test") await testNotification();
  else if (action === "unbind") unbind();
  else usage(2);
} catch (error) {
  console.error(`操作失败：${error.message}`);
  process.exitCode = 1;
}

async function bind() {
  let account = readAccount(paths);
  if (isActivated(account)) {
    console.log(`微信已绑定（${maskId(account.user_id)}），Codex Stop 通知已启用。`);
    return;
  }

  if (!account) {
    console.log("正在获取 ClawBot 扫码页面……");
    const qr = await fetchLoginQr();
    presentQr(qr.pageUrl);
    account = await waitForLogin({
      qrcode: qr.qrcode,
      timeoutMs: 300_000,
      onEvent(event) {
        if (event.kind === "scanned") console.log("已扫码，请在微信中确认登录……");
        if (event.kind === "refreshed") {
          console.log("二维码已刷新，请扫描新页面。");
          presentQr(event.pageUrl);
        }
      },
    });
    writeAccount(account, paths);
    console.log(`扫码成功（微信 ${maskId(account.user_id)}）。`);
  } else {
    console.log(`发现尚未激活的绑定（微信 ${maskId(account.user_id)}），继续等待会话消息。`);
  }

  console.log("请现在给新绑定的 ClawBot 发送任意一条微信消息，用来激活通知会话……");
  account = await waitForActivation(account, 300_000);
  writeAccount(account, paths);

  const client = createClient(account);
  await client.sendText({
    contextToken: account.context_token,
    toUserId: account.to_user_id,
    text: "✅ Codex CLI 完成通知已启用。之后每轮任务结束时，我会把最后回答发到这里。",
  });
  console.log("绑定与激活完成。之后所有启用本插件的 Codex CLI 窗口都会发送完成提醒。");
}

async function waitForActivation(account, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const client = createClient(account, 45_000);
  let cursor = String(account.get_updates_buf ?? "");
  while (Date.now() < deadline) {
    try {
      const update = await client.getUpdates(cursor);
      cursor = update.cursor;
      account = { ...account, get_updates_buf: cursor };
      writeAccount(account, paths);
      for (const message of update.messages) {
        const route = activationRoute(message, account.user_id);
        if (route) return { ...account, ...route, activated_at: new Date().toISOString() };
      }
    } catch (error) {
      if (Date.now() >= deadline) break;
      console.log(`等待消息时暂时断线，正在重试（${error.message}）……`);
    }
  }
  throw new Error("等待微信激活消息超时；再次对 Codex 说“绑定微信通知”即可继续，不需要重新扫码");
}

function status() {
  const account = readAccount(paths);
  if (!account) {
    console.log("状态：未绑定微信。对 Codex 说“绑定微信通知”即可开始绑定。");
    return;
  }
  if (!isActivated(account)) {
    console.log(`状态：微信 ${maskId(account.user_id)} 已扫码，但通知会话尚未激活。对 Codex 说“绑定微信通知”，并给 ClawBot 发一条消息。`);
    return;
  }
  console.log(`状态：微信 ${maskId(account.user_id)} 已绑定，Codex CLI Stop 通知已启用。`);
}

async function testNotification() {
  const account = readAccount(paths);
  if (!isActivated(account)) throw new Error("尚未完成微信绑定；请先对 Codex 说“绑定微信通知”");
  await createClient(account).sendText({
    contextToken: account.context_token,
    toUserId: account.to_user_id,
    text: "🧪 Codex WeChat Notifier 测试成功。",
  });
  console.log("测试通知已发送到微信。");
}

function unbind() {
  removeAccount(paths);
  console.log("已删除本地 ClawBot 绑定凭据；后续任务完成时不会再发送微信通知。");
}

function createClient(account, timeoutMs = 12_000) {
  return new IlinkClient({ baseUrl: account.base_url, token: account.token, timeoutMs });
}

function presentQr(url) {
  console.log("扫码页面将在默认浏览器中打开，请用微信扫描页面里的二维码（5 分钟内有效）。");
  try {
    let command;
    let args;
    if (process.platform === "win32") {
      command = "rundll32.exe";
      args = ["url.dll,FileProtocolHandler", url];
    } else if (process.platform === "darwin") {
      command = "open";
      args = [url];
    } else {
      command = "xdg-open";
      args = [url];
    }
    spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true }).unref();
  } catch {
    console.log(`无法自动打开浏览器，请手动打开此临时页面：${url}`);
  }
}

function usage(exitCode) {
  console.log("用法：node connect.mjs <bind|status|test|unbind>");
  process.exitCode = exitCode;
}
