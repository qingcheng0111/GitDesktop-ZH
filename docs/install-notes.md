# GitDesktop 安装记录

日期：2026-10-21 19:31–19:36（CST）
执行：Hermes Agent（本机 macOS 27.0.1，Apple Silicon）

## 一、安装了什么

| 项目 | 值 |
|---|---|
| 应用 | GitDesktop（作者 theBGuy） |
| 版本 | 0.13.6（build 2026-10-21） |
| 来源 | https://github.com/theBGuy/GitDesktop/releases/tag/v0.13.6 |
| 资产 | `GitDesktop_0.13.6_universal.dmg`，42,699,901 字节（与 release 资产大小逐字节一致） |
| SHA-256 | `71e83a6ce1a981969f053c776a58d4ff56d819631a184d9d4bba933fa1fa4e45`（release 未提供官方校验值，此值供你将来自查） |
| 安装位置 | `/Applications/GitDesktop.app`（133 MB） |
| Bundle ID | `com.thebguy.gitdesktop` |
| 架构 | universal：arm64 + x86_64 |
| 最低系统 | Info.plist 声明 10.13 |
| 许可证 | Apache-2.0 |
| 签名形态 | Developer ID Application: Evan Goldberg (89CH43FR87)，`spctl` 判定 `accepted / source=Notarized Developer ID`（已公证，非 ad-hoc） |
| 隔离属性 | 已 `xattr -dr com.apple.quarantine`，仅剩 `com.apple.provenance`（系统标记，正常） |

安装方式：`hdiutil attach` 挂载 → `ditto` 落盘到 `/Applications` → 清 quarantine → 卸载卷。未使用 sudo。

## 二、依赖

GitDesktop 不自己存 GitHub 凭据，全部通过本机 GitHub CLI 访问：

- `gh` 2.102.0 已安装（/opt/homebrew/bin/gh）
- `gh auth status`：已登录 github.com，账号 `923106608-lang`（凭据在钥匙串，非明文）
- 应用数据目录 `~/Library/Application Support/com.thebguy.gitdesktop/` 内已扫描 `gho_ / ghp_ / github_pat_` 前缀，无任何命中 —— 磁盘上没有 token

## 三、实测（非“装完就算”）

| 验证项 | 操作 | 实际结果 |
|---|---|---|
| 独立桌面启动 | `open -a /Applications/GitDesktop.app` | 进程 pid 48350 存活，窗口 “GitDesktop” 渲染，欢迎页可见 |
| 进入搜索 | 点 Explore repositories | 打开 “Explore repositories”，含 GitHub / GitLab / Bitbucket 三个标签，默认 GitHub |
| 全局关键词搜索 | 搜 `ripgrep` | 返回 25 条跨账号结果：BurntSushi/ripgrep（6.9万 stars）、phiresky/ripgrep-all（9893）、jremmen/vim-ripgrep（565）、microsoft/vscode-ripgrep（204）、learnbyexample/learn_gnugrep_ripgrep（353）… 每条带 star 数、简介、Archived 标记 |
| 结果点击 | 点 BurntSushi/ripgrep | 右侧加载该仓库详情与完整 README 预览，附 Clone / Fork / Star / View on GitHub 四个按钮 |
| 跳转 GitHub | 点 View on GitHub | 系统默认浏览器（ego lite）被唤起，窗口标题变为 `BurntSushi/ripgrep: ripgrep recursively searches directories for a regex pattern while respecting your gitignore`，确认落到正确仓库页 |
| 排序 | 默认 Best match，另有 Most stars / Recently updated | 可见可用 |

结论：按关键词搜索任意 GitHub 项目、结果可点击跳转，两项核心验收均在实机通过。

## 四、限制与注意

1. 强依赖 `gh` CLI 的登录态：`gh auth logout` 后应用内 GitHub 功能即失效；换账号要改 gh 的登录，不在应用里切。
2. “Load more” 分页按钮在后台自动化点击（app_post / 双击 / sky_click 三种投递）下均未触发新一页，列表维持 25 条 —— 可能是按钮需要真实前台焦点。此项未确认，不影响单页搜索结论。
3. 应用默认开启匿名使用统计（`settings.json` 里 `analyticsEnabled: true`，设置路径 Settings → General）。本次未改动；要关可在该设置里关掉，或改 `settings.json`。
4. 多平台客户端不止 GitHub：GitLab / Bitbucket 标签同屏，属其设计，不影响本用途。
5. 应用未注册登录项、未写 `~/Library/LaunchAgents`（已核），不会开机自启。

## 五、卸载

```bash
rm -rf "/Applications/GitDesktop.app"
rm -rf "$HOME/Library/Application Support/com.thebguy.gitdesktop"
```

如曾在应用内登录过 GitLab/Bitbucket 等额外凭据，另查 `~/Library/Preferences/com.thebguy.gitdesktop.plist` 与钥匙串中 `gitdesktop` 相关条目。`gh` 的登录态是共享的，卸载应用不会清除，按需自行 `gh auth logout`。

## 六、证据文件

- `截图/搜索ripgrep-结果与预览.png` — 搜索结果列表 + BurntSushi/ripgrep README 预览
- `截图/搜索ripgrep-结果列表.png` — 同一视图（分页点击尝试后）
