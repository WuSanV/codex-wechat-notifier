# Codex WeChat Notifier

在 Codex CLI 完成任务后，自动将最终结果推送到微信。插件通过微信 ClawBot 扫码绑定，借助 Codex `Stop` hook 实现全自动通知。

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

## 安装

### 方式一：在 Codex 对话中直接安装（推荐）

Codex CLI 和桌面版都可以自行执行终端命令，因此你可以直接在 Codex 对话中用自然语言完成安装。对 Codex 说：

```text
帮我安装 https://github.com/WuSanV/codex-wechat-notifier
```

Codex 会自动执行以下命令完成安装：

```bash
codex plugin marketplace add WuSanV/codex-wechat-notifier
codex plugin add codex-wechat-notifier@codex-wechat-notifier
```

### 方式二：手动执行命令安装

在终端中依次执行以下命令：

```bash
codex plugin marketplace add WuSanV/codex-wechat-notifier
codex plugin add codex-wechat-notifier@codex-wechat-notifier
```

#### Codex 桌面版用户

桌面版安装后会在本地生成 `codex.exe`，通常位于 `安装目录\resources\` 下。如果终端中直接输入 `codex` 无法识别，请使用完整路径调用：

```powershell
& "你的Codex安装目录\resources\codex.exe" plugin marketplace add WuSanV/codex-wechat-notifier
& "你的Codex安装目录\resources\codex.exe" plugin add codex-wechat-notifier@codex-wechat-notifier
```

也可以打开 Codex 桌面版，在左侧 **Plugins** 面板中搜索并安装。

### 方式三：从本地克隆安装

适用于本地开发或从 GitHub 克隆后安装：

```bash
git clone https://github.com/WuSanV/codex-wechat-notifier.git
codex plugin marketplace add ./codex-wechat-notifier
codex plugin add codex-wechat-notifier@codex-wechat-notifier
```

如果 PowerShell 因执行策略阻止 `codex.ps1`，可在 Windows 上把上述命令中的 `codex` 临时替换为 `codex.cmd`。

> ⚠️ 从本地路径安装时，marketplace 指向的是当前工作树的快照。如果后续修改了代码，需要重新执行 `marketplace add` 和 `plugin add` 才能更新到最新版本。

### 安装后：信任 Hook 并启用

安装完成后，**必须完全退出并重新打开 Codex**，因为 hooks 是启动时加载的。

重新打开后会出现 Hooks 审核提示：

```
Hooks need review
1 hook is new or changed.
Hooks can run outside the sandbox after you trust them.
1. Review hooks
2. Trust all and continue
3. Continue without trusting (hooks won't run)
```

**选 2（Trust all and continue）最方便**，一步到位。

如果选 **1（Review hooks）**，则需要手动操作：进入 Stop hooks 列表，找到 codex-wechat-notifier 的 hook，按 **Space** 或 **Enter** 将其切换为 `[x]` 开启状态：

```
[x] Hook 1

  Event     Stop
  Source    Plugin - codex-wechat-notifier@codex-wechat-notifier
  Command   node ".../scripts/on-stop.mjs"
  Timeout   20s
  Trust     Trusted
```

然后按 **Esc** 返回即可。Hook 启用后，每轮 Codex 任务结束时就会自动触发微信通知。

### 验证安装

在终端执行以下命令确认插件已正确安装：

```bash
codex plugin list --json
```

确认输出中 `"installed": true`，并且 `source.path` 指向插件目录。

## 绑定微信

新建一个 Codex 对话，对 Codex 说：

```text
绑定微信通知
```

随后：

1. 在自动打开的浏览器页面中，用微信扫描二维码。
2. 扫码确认后，给新绑定的 ClawBot 发送任意一条消息。
3. 等待 Codex 报告"绑定与激活完成"。
4. 对 Codex 说"发送微信测试通知"，确认微信能够收到测试消息。

若已经扫码但尚未激活，再说一次"绑定微信通知"，然后给 ClawBot 发送一条新消息即可恢复流程，不需要重新扫码。

## 常用操作

直接在 Codex 对话中使用自然语言：

```text
查看微信通知状态
发送微信测试通知
绑定微信通知
解绑微信通知
```

解绑会删除本机保存的 ClawBot 凭据并停止后续通知，因此插件会在执行前要求确认。

### Windows 手动操作绑定/解绑

如果无法通过 Codex 对话操作，也可以直接运行脚本。先找到插件缓存路径：

```powershell
$plugin = "$env:USERPROFILE\.codex\plugins\cache\codex-wechat-notifier\codex-wechat-notifier\<version>"

# 绑定
node "$plugin\scripts\connect.mjs" bind

# 解绑
node "$plugin\scripts\connect.mjs" unbind

# 发送测试通知
node "$plugin\scripts\connect.mjs" test
```

将 `<version>` 替换为实际版本号目录名（如 `0.1.1+codex.20260815094245`）。

## 更新

```bash
codex plugin marketplace upgrade codex-wechat-notifier
codex plugin add codex-wechat-notifier@codex-wechat-notifier
```

更新或重新安装后，请新建一个 Codex 对话以加载新版本。原有绑定状态不受影响，无需重新扫码。

## 卸载

建议先在 Codex 中说"解绑微信通知"并确认删除本地凭据，然后执行：

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
node scripts/connect.mjs bind     # 绑定微信
node scripts/connect.mjs status   # 查看状态
node scripts/connect.mjs test     # 发送测试通知
node scripts/connect.mjs unbind   # 解绑微信
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
│   │   ├── connect.mjs
│   │   ├── on-stop.mjs
│   │   └── lib/
│   │       ├── ilink.mjs
│   │       └── state.mjs
│   └── skills/wechat-notifier/
│       ├── SKILL.md
│       └── agents/
├── tests/
│   └── notifier.test.mjs
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

确认消息发给的是刚刚绑定的新 ClawBot。重新说"绑定微信通知"，等监听开始后再发送一条新消息。

### Codex 显示通知已发送，但微信没收到

先说"查看微信通知状态"，再说"发送微信测试通知"。同时检查网络是否能访问 `ilinkai.weixin.qq.com`。

### 完成任务后没有自动通知

按以下顺序排查：

1. **确认插件已安装**：执行 `codex plugin list --json`，确认 `"installed": true`。
2. **确认 Hook 已信任并启用**：安装后重新打开 Codex 时，会弹出 Hooks 审核提示。选 2（Trust all and continue）最省事；如果选 1（Review hooks），则需手动进入 Stop hooks 列表，按 Space/Enter 将对应 hook 切换为 `[x]` 开启。
3. **确认新建了对话**：安装后必须新建 Codex 对话才能加载 hooks。
4. **查看日志**：绑定状态正常但仍失败时，查看 `~/.codex-wechat-notifier/notifier.log`；分享日志前请先检查并移除敏感信息。

### marketplace 已存在需要重新安装

如果提示 marketplace 已存在，先执行：

```bash
codex plugin marketplace remove codex-wechat-notifier
```

再重新执行 marketplace add 和 plugin add。

## License

[MIT](LICENSE)
