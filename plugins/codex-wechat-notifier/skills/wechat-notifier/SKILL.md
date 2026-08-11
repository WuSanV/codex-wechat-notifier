---
name: wechat-notifier
description: Bind, inspect, test, or unbind the standalone Codex WeChat completion notifier. Use when the user asks to connect WeChat or ClawBot, enable Codex CLI completion notifications, check notification status, send a test notification, switch the bound WeChat account, or disable notifications.
---

# WeChat Notifier

Run the deterministic management script. Resolve all relative paths from this skill directory; the script is at `../../scripts/connect.mjs`.

## Actions

- Bind or resume activation: `node ../../scripts/connect.mjs bind`
- Show status: `node ../../scripts/connect.mjs status`
- Send a test notification: `node ../../scripts/connect.mjs test`
- Unbind: `node ../../scripts/connect.mjs unbind`

For `bind`, use a timeout of at least 10 minutes. Tell the user to scan the browser QR code and then send any message to the new bot when prompted. Return the script's result.

Before `unbind`, confirm that the user intends to remove the local ClawBot credential and stop future notifications. Do not display or copy token files. Do not edit Codex configuration manually; plugin hooks are installed with the plugin.
