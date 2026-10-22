# GitDesktop-ZH（汉化版）

**简体中文** | [English](README.en.md)

基于 [theBGuy/GitDesktop](https://github.com/theBGuy/GitDesktop) v0.13.6 的中文特化构建：界面汉化、仓库内容翻译、中文排版调校，外加几处影响日常使用的修复。

![欢迎页](docs/screenshots/welcome.png)

## 做了什么

### 1. 界面汉化（词典级）

设置 → 外观与字体 → 界面语言 可在「简体中文 / English」之间切换。切回 English 会把所有被改写的文本节点与属性还原（原值存在 WeakMap 里，React 重渲染后仍能还原），不做一次性替换。

- 覆盖约 330 条高频文案：导航、仓库主视图、探索页、设置面板与常用对话框
- 词典未收录的文案保持英文原样，不会被机器翻译成奇怪措辞
- 不是完整 i18n 重构：上游约 1,300 条界面字符串，覆盖不到的深层设置项、罕见对话框、错误提示仍是英文

### 2. 仓库内容翻译

设置 → 内容翻译，把 README、议题、拉取请求、讨论正文译成中文。

![内容翻译设置](docs/screenshots/settings-translation.png)

三档模式：

| 模式 | 行为 |
|---|---|
| 自动 | 打开即翻译，每篇右上角可一键切回原文 |
| 手动 | 点右上角按钮才翻译 |
| 关闭 | 保持英文，不发任何请求 |

引擎按顺序降级：**AI 模型 → 浏览器同源接口 → 必应 → LibreTranslate → MyMemory**。任一档失败自动换下一档，全挂时原样显示英文。

实现要点：

- 按行切分 Markdown 源码，只翻散文部分；代码块、表格分隔线、图片行、setext 横线原样保留
- 行内结构（代码段、链接、图片目标）掩码成 `[[n]]` 占位符整体搬运，接口重排语序也不会把链接拆坏
- 段落级替换：译文到达后整体切换，没有逐句流式效果
- 缓存 120 篇 LRU，重开同一仓库不再走网络

![翻译后的 README](docs/screenshots/readme-translated.png)

### 3. 字体与排版

设置 → 外观与字体：

![外观与字体](docs/screenshots/settings-appearance.png)

- **界面字体** 12 项：苹方 / 黑体 / 宋体 / 楷体 / 仿宋 / 圆体 / 冬青黑体 / 兰亭黑 / 隶变 / 行楷 / 魏碑 / 系统默认，本机缺的字族在选项里标「未安装」
- **代码字体** 7 项：JetBrains Mono（内置）/ Menlo / SF Mono / Monaco / Consolas / Courier New / 系统等宽
- **排版** 5 项与字族正交：界面字重 300–600、界面字号 13–18 px、界面字距 −0.01~+0.02em、代码字重 300–600、代码字号 10–16 px，另有「恢复默认排版」

字号不是缩放系数而是两个独立值：调界面字号不该让 diff 跟着变宽，调代码字号也不该撑大侧栏。代码字号用绝对 px，`<pre><code>` 嵌套不会层层缩小。

字体可用性用 DOM 布局测宽判定（同一串文字换字族前后宽度是否变化，三条基线交叉比对）。早期版本用 canvas `measureText`，在 WKWebView 里对系统按需字族一律返回回退宽度，把 7 个可用字体误标成「未安装」。

![12 种字族全部可用](docs/screenshots/fonts-all.png)

### 4. 修复

| 问题 | 原因 | 处理 |
|---|---|---|
| README 图片全是碎图占位 | 相对路径 + 中文文件名没有按仓库 raw 内容根重写 | 按仓库内容根解析并百分号编码 |
| 关闭窗口后点 Dock 图标打不开 | 事件循环用 `.run(context)` 简写，没接 macOS 的 `applicationShouldHandleReopen` | 改为 `.build().run(|app, event|)` 接住 `RunEvent::Reopen`，唤回前先 `app.show()` 覆盖 Cmd+H |
| 自动更新会把界面换回英文 | 更新包是上游签名产物 | `plugins.updater.endpoints` 置空，关闭自动更新 |

图片修复前后对比：

| 修复前 | 修复后 |
|---|---|
| ![前](docs/screenshots/images-before.png) | ![后](docs/screenshots/images-after.png) |

## 下载与安装

从 [Releases](https://github.com/923106608-lang/GitDesktop-ZH/releases) 下载 `GitDesktop_0.13.6_aarch64.dmg`。

1. 打开 DMG，把 GitDesktop 拖进「应用程序」
2. 首次启动若提示「无法验证开发者」，右键 → 打开，或在「系统设置 → 隐私与安全性」里放行

产物情况：

| 项目 | 值 |
|---|---|
| 版本 | 0.13.6-zh.1（基于上游 0.13.6） |
| 架构 | **arm64**（未做 universal 合并，Intel Mac 不适用） |
| 体积 | 20 MB |
| 签名 | ad-hoc，未公证 |

## 从源码构建

前置：Node 20+、pnpm、Rust stable、Xcode Command Line Tools。

```bash
cd src
pnpm install --frozen-lockfile
source "$HOME/.cargo/env"
pnpm tauri build --bundles app     # 产物 src/src-tauri/target/release/bundle/macos/GitDesktop.app
pnpm tauri build --bundles dmg     # 产物 src/src-tauri/target/release/bundle/dmg/*.dmg
```

注意：`--bundles dmg` 会先清理旧的 `.app`，要两份产物都留就再跑一次 `--bundles app`。

## 目录结构

```
src/                 完整源码（前端 React + 后端 Rust/Tauri）
  src/lib/i18n/      界面词典与 DOM 翻译器
  src/lib/translate/ 内容翻译：分句、掩码、引擎链、缓存
  src/lib/fonts.ts   字体与排版预设
  src/features/settings/  设置面板
  src-tauri/src/     Rust 侧：托盘、窗口、git、GitHub API
docs/
  zh-guide.md        完整汉化说明（实现细节 + 验收记录）
  install-notes.md   本机安装记录
  screenshots/       截图
```

## 已知限制

1. 汉化是词典级，不是完整 i18n 重构；深层设置项、罕见对话框、错误提示仍是英文。
2. 默认翻译引擎是浏览器同源接口，不是公开 API：没有服务条款承诺的稳定性，随时可能改版或限流，改版后需要更新 `src/lib/translate/engine.ts` 的解析逻辑。
3. 段落级替换，没有逐句流式效果。
4. 表格单元格、极短标签、纯代码行不翻译（有意为之）。
5. 关闭了自动更新：上游更新包会把界面换回英文，且本构建不是用上游签名密钥打的。要更新时重新拉上游源码并重做本文档描述的全部改动。
6. 未做代码签名与公证，拷给其他机器会被 Gatekeeper 拦。
7. 产物是 arm64 单架构。

## 致谢与许可

- 上游：[theBGuy/GitDesktop](https://github.com/theBGuy/GitDesktop)，Apache-2.0
- 汉化词表参考：[maboloshi/github-chinese](https://github.com/maboloshi/github-chinese)（社区 GitHub 中文化脚本）
- 本项目沿用 Apache-2.0，见 [LICENSE](src/LICENSE)

原版与本文档所述改动的完整实现记录见 [docs/zh-guide.md](docs/zh-guide.md)。
