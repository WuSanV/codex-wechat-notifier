import crypto from "node:crypto";

const DEFAULT_BASE_URL = "https://ilinkai.weixin.qq.com";
const APP_ID = "bot";
const CLIENT_VERSION = String((2 << 16) | (2 << 8) | 0);

export class IlinkClient {
  constructor({ baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch, timeoutMs = 12_000, token } = {}) {
    if (!token) throw new Error("Missing ClawBot token");
    this.baseUrl = stripSlash(baseUrl);
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.token = token;
  }

  async getUpdates(cursor = "") {
    const body = await this.request(
      "ilink/bot/getupdates",
      { base_info: baseInfo(), get_updates_buf: cursor },
      Math.max(this.timeoutMs, 40_000),
    );
    return {
      cursor: String(body.get_updates_buf ?? cursor),
      messages: Array.isArray(body.msgs) ? body.msgs : [],
    };
  }

  async sendText({ contextToken, text, toUserId }) {
    await this.request("ilink/bot/sendmessage", {
      base_info: baseInfo(),
      msg: {
        client_id: `codex-wechat-notifier:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`,
        context_token: contextToken,
        from_user_id: "",
        item_list: [{ text_item: { text }, type: 1 }],
        message_state: 2,
        message_type: 2,
        to_user_id: toUserId,
      },
    });
  }

  async request(endpoint, body, timeoutMs = this.timeoutMs) {
    const response = await this.fetchImpl(`${this.baseUrl}/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        AuthorizationType: "ilink_bot_token",
        "iLink-App-Id": APP_ID,
        "iLink-App-ClientVersion": CLIENT_VERSION,
        "content-type": "application/json",
        "X-WECHAT-UIN": randomWechatUin(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};
    if (!response.ok || hasFailureCode(parsed.errcode) || hasFailureCode(parsed.ret)) {
      throw new Error(`ClawBot request failed (HTTP ${response.status})`);
    }
    return parsed;
  }
}

export async function fetchLoginQr({ fetchImpl = fetch } = {}) {
  const result = await loginGet(DEFAULT_BASE_URL, "ilink/bot/get_bot_qrcode?bot_type=3", fetchImpl);
  const qrcode = String(result.qrcode ?? "").trim();
  const pageUrl = String(result.qrcode_img_content ?? "").trim();
  if (!qrcode || !pageUrl) throw new Error("ClawBot did not return a login QR code");
  return { pageUrl, qrcode };
}

export async function waitForLogin({ fetchImpl = fetch, onEvent = () => {}, qrcode, timeoutMs = 300_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let baseUrl = DEFAULT_BASE_URL;
  let currentQr = qrcode;
  let refreshes = 0;
  while (Date.now() < deadline) {
    try {
      const result = await loginGet(baseUrl, `ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(currentQr)}`, fetchImpl);
      const status = String(result.status ?? "wait");
      if (status === "scaned") onEvent({ kind: "scanned" });
      if (status === "scaned_but_redirect" && result.redirect_host) baseUrl = `https://${result.redirect_host}`;
      if (status === "expired") {
        if (++refreshes > 3) throw new Error("QR code expired too many times");
        const next = await fetchLoginQr({ fetchImpl });
        currentQr = next.qrcode;
        baseUrl = DEFAULT_BASE_URL;
        onEvent({ kind: "refreshed", pageUrl: next.pageUrl });
      }
      if (status === "confirmed") {
        const account = {
          account_id: String(result.ilink_bot_id ?? "").trim(),
          base_url: String(result.baseurl ?? DEFAULT_BASE_URL).trim() || DEFAULT_BASE_URL,
          token: String(result.bot_token ?? "").trim(),
          user_id: String(result.ilink_user_id ?? "").trim(),
        };
        if (!account.account_id || !account.token || !account.user_id) throw new Error("ClawBot returned incomplete credentials");
        return account;
      }
    } catch (error) {
      if (error.message === "QR code expired too many times" || error.message === "ClawBot returned incomplete credentials") throw error;
    }
    await delay(1000);
  }
  throw new Error("Timed out waiting for QR confirmation");
}

export function activationRoute(message, boundUserId) {
  const senderId = String(message?.from_user_id ?? "").trim();
  const contextToken = String(message?.context_token ?? "").trim();
  if (!senderId || senderId !== String(boundUserId) || !contextToken) return null;
  const groupId = String(message?.group_id ?? "").trim();
  return {
    context_token: contextToken,
    to_user_id: groupId || senderId,
  };
}

async function loginGet(baseUrl, endpoint, fetchImpl) {
  const response = await fetchImpl(`${stripSlash(baseUrl)}/${endpoint}`, {
    headers: { "iLink-App-Id": APP_ID, "iLink-App-ClientVersion": CLIENT_VERSION },
    signal: AbortSignal.timeout(35_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`ClawBot login failed (HTTP ${response.status})`);
  return JSON.parse(text);
}

function baseInfo() {
  return { channel_version: "0.1.0" };
}

function hasFailureCode(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized !== "" && normalized !== "0";
  }
  return value !== 0 && value !== false;
}

function randomWechatUin() {
  return Buffer.from(String(crypto.randomBytes(4).readUInt32BE(0))).toString("base64");
}

function stripSlash(value) {
  return String(value).replace(/\/+$/u, "");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
