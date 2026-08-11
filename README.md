# Codex WeChat Notifier

把 Codex CLI 每轮任务完成后的最终回答发送到微信。插件通过微信 ClawBot 完成扫码绑定，并通过 Codex `Stop` hook 自动推送通知。

## 功能

- 微信扫码绑定，无需自行搭建通知服务器。
- Codex CLI 每轮任务结束后自动发送项目名、模型名和最终回答。
- 支持查看状态、发送测试通知、恢复未完成的绑定和安全解绑。
- 最终回答超过 3,200 个字符时自动截断，避免单条消息过长。
- 凭据仅保存在本机用户目录，不会写入项目仓库。
- 已兼容 ClawBot 私聊消息返回空 `group_id` 的情况。

## 环境要求

- 支持插件功能的较新版本 Codex CLI。
- Node.js 18 或更高版本。
- 可正常使用微信和 ClawBot 的网络环境。

检查版本：

```bash
codex --version
node --version
```

## 从 GitHub 安装

仓库名保持为 `codex-wechat-notifier` 时，有以下两种安装方式。

### 方式一：在 Codex 对话中直接安装（推荐）

Codex CLI 可以自行执行终端命令，因此你可以直接在 Codex 对话中用自然语言完成安装。把下面的 `YOUR_GITHUB_USERNAME` 替换为实际 GitHub 用户名，对 Codex 说：

```text
帮我安装 https://github.com/WuSanV/codex-wechat-notifier
```

Codex 会自动执行以下命令完成安装：

```bash
codex plugin marketplace add YOUR_GITHUB_USERNAME/codex-wechat-notifier
codex plugin add codex-wechat-notifier@codex-wechat-notifier
```

安装完成后，请新建一个 Codex 对话让插件生效。

### 方式二：手动执行命令安装

在终端中依次执行以下命令：

```bash
codex plugin marketplace add YOUR_GITHUB_USERNAME/codex-wechat-notifier
codex plugin add codex-wechat-notifier@codex-wechat-notifier
```

安装后请新建一个 Codex 对话，让 Codex 加载新插件。

### 从本地克隆安装

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/codex-wechat-notifier.git
codex plugin marketplace add ./codex-wechat-notifier
codex plugin add codex-wechat-notifier@codex-wechat-notifier
```

如果 PowerShell 因执行策略阻止 `codex.ps1`，可在 Windows 上把上述命令中的 `codex` 临时替换为 `codex.cmd`。

## 绑定微信

在新对话中对 Codex 说：

```text
绑定微信通知
```

随后：

1. 在自动打开的浏览器页面中，用微信扫描二维码。
2. 扫码确认后，给新绑定的 ClawBot 发送任意一条消息。
3. 等待 Codex 报告“绑定与激活完成”。
4. 对 Codex 说“发送微信测试通知”，确认微信能够收到测试消息。

若已经扫码但尚未激活，再说一次“绑定微信通知”，然后给 ClawBot 发送一条新消息即可恢复流程，不需要重新扫码。

## 常用操作

直接在 Codex 对话中使用自然语言：

```text
查看微信通知状态
发送微信测试通知
绑定微信通知
解绑微信通知
```

解绑会删除本机保存的 ClawBot 凭据并停止后续通知，因此插件会在执行前要求确认。

## 更新

```bash
codex plugin marketplace upgrade codex-wechat-notifier
codex plugin add codex-wechat-notifier@codex-wechat-notifier
```

更新或重新安装后，请新建一个 Codex 对话以加载新版本。

## 卸载

建议先在 Codex 中说“解绑微信通知”并确认删除本地凭据，然后执行：

```bash
codex plugin remove codex-wechat-notifier@codex-wechat-notifier
```

如果插件已经卸载但仍需手动清理绑定状态，可删除用户主目录中的 `.codex-wechat-notifier` 目录。该目录可能包含 ClawBot 令牌，请勿上传或分享其中内容。

## 数据与隐私

- 绑定状态默认保存在 `~/.codex-wechat-notifier/account.json`。
- 失败日志默认保存在 `~/.codex-wechat-notifier/notifier.log`。
- 插件会把 Codex 最终回答发送到微信 ClawBot 服务 `ilinkai.weixin.qq.com`。请不要在启用通知的任务最终回答中放入不希望发送到微信的敏感信息。
- 仓库不包含任何账号、令牌、二维码或聊天记录。
- 可用环境变量 `CODEX_WECHAT_NOTIFIER_HOME` 修改本地状态目录。

## 工作原理

```text
Codex CLI 任务完成
        │
        ▼
      Stop hook
        │
        ▼
scripts/on-stop.mjs ──► ClawBot API ──► 微信
```

插件的管理 skill 会调用 `scripts/connect.mjs` 完成以下操作：

```bash
node scripts/connect.mjs bind
node scripts/connect.mjs status
node scripts/connect.mjs test
node scripts/connect.mjs unbind
```

通常无需直接运行这些脚本，优先在 Codex 对话中使用自然语言操作。

## 目录结构

```text
.
├── .agents/plugins/marketplace.json
├── plugins/codex-wechat-notifier/
│   ├── .codex-plugin/plugin.json
│   ├── hooks/hooks.json
│   ├── scripts/
│   └── skills/wechat-notifier/
├── tests/
├── LICENSE
└── README.md
```

## 开发与测试

项目无第三方运行时依赖。修改后执行：

```bash
node --test tests/*.test.mjs
node --check plugins/codex-wechat-notifier/scripts/connect.mjs
node --check plugins/codex-wechat-notifier/scripts/on-stop.mjs
```

发布前还应使用 Codex 的插件校验器检查 `plugins/codex-wechat-notifier`。

## 故障排查

### 已扫码但一直未激活

确认消息发给的是刚刚绑定的新 ClawBot。重新说“绑定微信通知”，等监听开始后再发送一条新消息。

### Codex 显示通知已发送，但微信没收到

先说“查看微信通知状态”，再说“发送微信测试通知”。同时检查网络是否能访问 `ilinkai.weixin.qq.com`。

### 完成任务后没有自动通知

确认插件已安装，并在安装后新建了 Codex 对话。绑定状态正常但仍失败时，查看 `~/.codex-wechat-notifier/notifier.log`；分享日志前请先检查并移除敏感信息。

## License

[MIT](LICENSE)
