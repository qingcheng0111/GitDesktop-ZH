# GitDesktop 汉化版（本地构建）

上游项目：https://github.com/theBGuy/GitDesktop
源码版本：v0.13.6，commit `3800c597088b2af3896a32a6e6a791831ce436ae`（2026-10-20）
源码位置：`./src`（浅克隆，单 commit）
可运行产物：`src/src-tauri/target/release/bundle/macos/GitDesktop.app`
许可证：Apache-2.0（上游 LICENSE 原样保留，本目录改动同样受其约束）


> **发布说明**：本文是实现记录，文中提到的截图文件名沿用了开发时的中文命名；仓库内实际发布的截图在 `docs/screenshots/` 下，用的是 ASCII 文件名（`welcome.png`、`settings-appearance.png`、`settings-translation.png`、`readme-translated.png`、`fonts-all.png`、`images-before.png`、`images-after.png`、`dock-reopen.png`）。功能与数据描述不受影响。


## 一、三项功能

### 1. 软件层汉化

界面文案通过 DOM 层词典翻译，词典在 `src/src/lib/i18n/ui-dict.ts`（约 330 条精确条目 + 14 条动态模式 + 标点归一化匹配）。

- 覆盖：导航与侧栏、欢迎页、探索仓库页、仓库主视图（更改 / 历史 / 拉取请求）、设置页全部面板名与常用项、常用按钮、空状态、placeholder 与 aria-label。
- 未收录的文案保持英文原文，不做机器翻译：短标签机翻会产出「存储库 / 代码库 / 仓库」三种叫法混排，比不翻更难读。要扩就按界面上的英文原文往 `ui-dict.ts` 加键。
- 切换：设置 → 外观与字体 → 界面语言（简体中文 / English）。切回 English 会把所有被改写的文本节点与属性原样还原（原值存在 WeakMap 里，React 重渲染后仍能还原）。
- 明确不翻译：Markdown 正文（交给内容翻译）、代码块、终端输出、差异视图、列表行（提交/文件行）。这些都是用户数据——一个叫 `Branch` 的文件夹不该变成「分支」。

### 2. 仓库内英文内容汉化（自动 / 手动 / 关闭）

作用于所有 Markdown 正文：仓库 README、议题、拉取请求描述、讨论、评论。

| 模式 | 行为 |
|---|---|
| 自动 | 正文渲染后立即请求翻译，译文到达即替换；每篇右上角「显示原文」一键切回 |
| 手动 | 正文保持英文，右上角出现「翻译为中文」，点一下才翻译 |
| 关闭 | 完全不翻译仓库内容；界面汉化不受影响 |

开关位置：设置 → 内容翻译（模式、引擎、缓存计数、清空缓存、测试翻译）。

引擎命中顺序（`src/src/lib/translate/engine.ts`）：

1. AI 模型 —— 设置 → AI 里已配置的 provider/model（质量最好，支持 Anthropic/OpenAI/DeepSeek/OpenRouter/Ollama/本机 CLI）。
2. 浏览器同源翻译 —— `translate.googleapis.com/translate_a/t?client=dict-chrome-ex`，即 Chrome 内置翻译使用的接口，无需密钥，支持一次请求批量传多段（一次 40 段 / 3500 字符），质量与浏览器右键翻译同级。
3. 必应翻译 —— `cn.bing.com/ttranslatev3`（Edge 内置翻译同源），需先取页面里的 IG/IID/key/token，会话缓存 10 分钟。
4. LibreTranslate 公共实例、MyMemory —— 兜底，质量与额度都较差。

结构保护（`src/src/lib/translate/markdown.ts`）：

- 按行切分，代码围栏整段跳过；连续硬换行的正文行先合并成段落再送翻译（否则英文长句被按 80 列切断，译文会出现「搜索当前 / 正则表达式模式的目录」这种断句）。
- 行内代码、链接（`[`、`](目标)` 分别占位）、图片、HTML 标签、加粗标记、表格竖线先替换为 `[[n]]` 占位符，译后还原；任何一行占位符丢失或数量对不上，整行保留英文。
- 占位符用 ASCII `[[n]]` 而不是花括号：Chrome 接口对以 `⟦0⟧` 开头的行直接返回空串，且会把 `[文字](链接)` 改写成 `【文字】(链接)`，两者都会破结构。

缓存：本机 localStorage（`gd-translation-cache-v1`），最多 120 篇 LRU；重开同一仓库不再走网络。并发上限 2，单请求 15 秒超时，失败在正文角上显示「翻译失败，点击重试」，不会卡在「翻译中…」。

### 3. 多字体与排版设置

设置 → 外观与字体：

- 界面字体：苹方（默认）/ 黑体 / 宋体 / 楷体 / 仿宋 / 圆体 / 冬青黑体 / 兰亭黑 / 隶变 / 行楷 / 魏碑 / 系统默认（12 项，本机缺的字族在选项里标「未安装」）
- 代码字体：JetBrains Mono（内置）/ Menlo / SF Mono / Monaco / Consolas / Courier New / 系统等宽
- 排版（本轮新增，与字族正交）：
  - 界面字重：细体 300 / 常规 400 / 中黑 500 / 半粗 600
  - 界面字号：13–18 px，作用于文档根字号，列表、侧栏、正文一起缩放
  - 界面字距：紧凑 −0.01em / 标准 0 / 舒展 +0.01em / 宽松 +0.02em
  - 代码字重：细体 300 / 常规 400 / 中黑 500 / 半粗 600
  - 代码字号：10–16 px，独立于界面基准
  - 「恢复默认排版」一键回到 400 / 16 px / 0 / 400 / 12 px，不动字族

实现（`src/src/lib/fonts.ts`）：界面字体写入 `<html>` 的 `--font-ui` / `--font-mono` / `--font-sans`（本项目正文整体挂在 `--font-mono` 上），代码字体写入 `--font-code`；排版写入 `--font-ui-weight` / `--font-ui-size` / `--font-ui-tracking` / `--font-code-weight` / `--font-code-size`。`App.css` 的 `html` 规则消费界面三项，`pre/code/kbd/samp/.cm-editor/.diff-tailwindcss-wrapper` 消费代码字重与字号，终端（`Terminal.tsx`）读 `--font-code` 与 `--font-code-size` 传给 xterm 自身的 `fontFamily` / `fontSize`（xterm 用 canvas 网格，CSS 改字号会让格子与字形错位）。字号用绝对 px 而非 em，`<pre><code>` 嵌套不会层层缩小。全部使用系统已装字形，不打包字体文件，切换即时生效。

字号不写成缩放系数而拆成两个值，是因为「界面字大一点」和「代码字大一点」是两个独立诉求：调界面字号不该让 diff 跟着变宽，调代码字号也不该撑大侧栏。

## 二、改动清单

| 文件 | 类型 | 内容 |
|---|---|---|
| `src/lib/i18n/ui-dict.ts` | 新增 | 中文词典、动态模式、标点归一化 |
| `src/lib/i18n/dom.ts` | 新增 | MutationObserver 界面翻译与还原 |
| `src/lib/fonts.ts` | 新增 | 字体预设、排版预设（字重/字号/字距）与 CSS 变量写入 |
| `src/lib/i18n/apply.ts` | 新增 | 启动/设置变更时应用语言、字体与排版 |
| `src/lib/translate/engine.ts` | 新增 | 五级引擎链、批量、超时、失败回退 |
| `src/lib/translate/markdown.ts` | 新增 | 段落合并、占位符保护、重组 |
| `src/lib/translate/store.ts` | 新增 | 译文缓存、并发上限、变更订阅 |
| `src/lib/translate/mode.ts` | 新增 | 三种模式的类型与文案 |
| `src/lib/translate/glossary.ts` | 新增 | 术语后处理（存储库→仓库 等） |
| `src/lib/translate/use-markdown-translation.ts` | 新增 | Markdown 组件的翻译 Hook |
| `src/features/settings/TranslationSection.tsx` | 新增 | 设置 → 内容翻译 面板 |
| `src/features/settings/AppearanceSection.tsx` | 改写 | 加界面语言、两个字体选择器与五项排版控件 |
| `src/features/settings/SettingsScreen.tsx` | 修改 | 面板名汉化、注册「内容翻译」面板 |
| `src/components/markdown/markdown.tsx` | 修改 | 接入翻译 Hook、右上角切换、正文 `data-no-i18n` |
| `src/lib/settings/api.ts` | 修改 | 新增 10 个设置项 + 默认值 + 读取校验（含排版越界修复） |
| `src/lib/settings/queries.ts` | 修改 | 新增 `useApplySettingsNow`（改动即存） |
| `src/main.tsx` | 修改 | 启动时应用语言与字体 |
| `src/App.css` | 修改 | 字体与排版变量规则（根字号、字重、字距、代码面字号） |
| `src/features/terminal/Terminal.tsx` | 修改 | 终端字体与字号跟随设置；输出 `data-no-i18n` |
| `index.html` | 修改 | `lang="zh-CN"` |
| `src-tauri/tauri.conf.json` | 修改 | 关闭 updater 产物与更新端点 |

新增设置项（`settings.json`）：`uiLanguage`、`contentTranslation`、`translationEngine`、`uiFont`、`codeFont`、`uiFontWeight`、`codeFontWeight`、`uiFontSize`、`codeFontSize`、`uiLetterSpacing`。旧配置缺字段时按默认值补齐，无需迁移；字重与字距做枚举校验，字号做区间夹取（13–18 / 10–16），手改成 `3` 或 `"18px"` 都读回默认值。

## 三、构建

前置：Node 20+、pnpm、Rust stable、Xcode Command Line Tools。

```bash
cd src
pnpm install --frozen-lockfile
source "$HOME/.cargo/env"
pnpm tauri build --bundles app     # 产物 target/release/bundle/macos/GitDesktop.app
```

开发模式：`pnpm tauri dev`。release 首编约 10 分钟，增量重编（仅前端改动）约 8 分钟。

## 四、图片显示修复（2026-10-21 追加）

现象：README 里的图片全部显示成碎图占位。

根因：README 写的是**仓库相对路径**（`docs/appicon.png`、`docs/微信赞赏码.jpg`、`docs/screenshots/dashboard.png`）。正文直接渲染在 webview 里，这些路径会按 `tauri://localhost/` 解析，永远取不到文件——与翻译功能无关，翻译前后一样坏。

修法（`src/lib/markdown/image-src.ts` + `markdown.tsx` 的 `imageBase` prop）：

| 输入 | 输出 |
|---|---|
| `docs/screenshots/dashboard.png` | `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/docs/screenshots/dashboard.png` |
| `docs/微信赞赏码.jpg` | 同上，路径段做百分号编码 → `docs/%E5%BE%AE...%E8%B5%9E%E8%B5%8F%E7%A0%81.jpg` |
| `./img/a.png`、`/docs/a.png`、`docs/../img/a.png` | 归一化后同样展开 |
| `https:`、`data:`、`asset:`、`tauri:`、`//cdn...`、`#anchor` | 原样不动 |

`HEAD` 用作 ref，默认分支叫 `main`/`master`/别的都能解析。GitLab / Bitbucket 分别走 `/-/raw/<ref>/` 与 `/raw/<ref>/`。

写入点：`ExploreDetail` 把 `rawContentBase(provider, repo.owner, repo.name, repo.defaultBranch)` 传给 `<Markdown imageBase>`；未传 `imageBase` 的调用点（本地仓库正文等）行为与上游一致，不受影响。

复验：`HanoCode/BuddyBot`（README 全用相对路径 + 中文文件名）修复前全是碎图占位，修复后应用图标、技术栈徽章、微信/支付宝赞赏码全部正常显示；翻译管线单独验过 `img` 标签数量不变，图片 Markdown 不会被译文破坏。

## 五、验收步骤

1. `open src/src-tauri/target/release/bundle/macos/GitDesktop.app`
2. 欢迎页应显示「仓库 / 探索仓库 / 我的工作」；点齿轮进设置，面板名应为「通用 / 外观与字体 / 内容翻译 …」
3. 探索仓库 → 搜 `ripgrep` → 点 `BurntSushi/ripgrep`：
   - 自动：README 数秒内变中文，右上角出现「显示原文」，正文里的链接仍是链接
   - 手动：README 保持英文，右上角「翻译为中文」，点一下才翻译
   - 关闭：无译文、无按钮
4. 设置 → 内容翻译 → 测试翻译：返回中文样例并标注实际引擎（正常应显示「浏览器同源翻译」）
5. 设置 → 外观与字体：切界面字体（如宋体）整窗立即变化；切代码字体，代码块与终端变化；切界面语言到 English，整窗回到英文

## 六、验收对照表（2026-10-21 实机实测）

构建：`0.13.6-cn.2`，产物时间 22:46。全部条目为真机操作后的实际返回值，不是设计意图。

### 1. 界面汉化

| 操作 | 预期 | 实测结果 | 结论 |
|---|---|---|---|
| 启动后看欢迎页 | 中文标题与按钮 | `完整流程，一个窗口。` / `打开仓库 Cmd+O` / `克隆仓库 Cmd+Shift+O` / `新建仓库 Cmd+N` / `我的工作` / `探索仓库` / `还没有仓库` | 通过 |
| 看欢迎页副标题 | 中文说明句 | `打开一个仓库，即可开始审查、提交与发布 —— 需要时还能让 AI 参与其中。` | 通过 |
| 点齿轮进设置，看左侧面板 | 16 个面板名全中文 | `通用 / 外观与字体 / 内容翻译 / AI / 斜杠命令 / MCP 服务器 / 自动化 / 通知 / 快捷键 / 账号 / Git / 语法高亮 / 外部编辑器 / 终端 / 更新 / 关于` | 通过 |
| 看通用面板的复选框 | 中文标签 | `隐藏 AI 功能`、`关闭窗口后继续在托盘运行`、`自动从远程获取` | 通过 |
| 看探索页 | 中文页签与状态 | `我的仓库` / `热门` / `最佳匹配` / `私有仓库` / `已归档` / `加载更多` | 通过 |
| 看仓库列表行内文案 | 行内是用户数据，保持原样 | 仓库名、描述、`6.9万 stars` 未被改写（有意为之） | 通过 |
| 切界面语言到 English | 整窗回英文原文 | 面板名、按钮、placeholder 全部还原为英文 | 通过 |

### 2. 仓库内容翻译（三档开关）

| 模式 | 操作 | 实测结果 |
|---|---|---|
| 自动 | 打开 `BurntSushi/ripgrep` 的 README | 约 20 秒内正文变中文；右上角出现「显示原文」；中文文本节点 81 个；标题为 `ripgrep（rg）`、`变更日志`、`文档快速链接`（不再夹带 `------------`） |
| 自动 | 检查译文里的链接 | 28 个 `<a>` 节点仍在，标签已译：`[每个版本](https://github.com/BurntSushi/ripgrep/releases)`、`[安装](#installation)`、`[用户指南](GUIDE.md)`、`[常见问题](FAQ.md)` —— 链接没被译文拆坏 |
| 自动 | 点「显示原文」 | 正文切回英文，按钮变「翻译为中文」 |
| 手动 | 设置里切到「手动」，再打开同一 README | 正文保持英文，右上角显示「翻译为中文」；点一下后变中文，按钮转「显示原文」 |
| 关闭 | 设置里切到「关闭」 | 无译文、无按钮 |
| 手动 | 点「翻译为中文」等 4 秒 | 译文即时替换（不需要切仓库/重开），无「翻译中…」卡死 |
| 任意 | 设置 → 内容翻译 → 测试翻译 | 返回 `按 [[0]] 安装 [[1]]，然后打开您的仓库。（引擎：浏览器同源翻译）`，正确标出实际引擎 |
| 任意 | 清空缓存 | 计数从 `1 篇` 归零为 `0 篇` |

### 3. 图片显示

| 操作 | 实测结果 |
|---|---|
| 修复前打开 `HanoCode/BuddyBot`（README 全用相对路径 + 中文文件名） | 应用图标、技术栈徽章、微信/支付宝赞赏码全部是蓝色碎图占位 |
| 修复后打开同一仓库 | 图标、徽章、赞赏码全部正常渲染，无碎图、无空白框 |
| 看修正后的 `src` | `https://raw.githubusercontent.com/HanoCode/BuddyBot/HEAD/docs/%E5%BE%AE%E4%BF%A1%E8%B5%9E%E8%B5%8F%E7%A0%81.jpg`（中文已百分号编码） |
| 翻译管线回归 | 同一 README 处理前后 `<img>` 数量不变（3 → 3） |

### 4. 字体切换

| 操作 | 实测结果 |
|---|---|
| 设置 → 外观与字体 → 界面字体，可选项 | 12 项：`苹方（默认）/ 黑体 / 宋体 / 楷体 / 仿宋 / 圆体 / 冬青黑体 / 兰亭黑 / 隶变 / 行楷 / 魏碑 / 系统默认` |
| 选「宋体 Songti SC」 | 整窗立即变宋体（截图可见横细竖粗、有装饰角），无需重启 |
| 回读 `settings.json` | `uiFont: "songti"`，重启后仍生效 |
| 代码字体可选项 | 7 项：`JetBrains Mono（内置）/ Menlo / SF Mono / Monaco / Consolas / Courier New / 系统等宽`，作用于代码块、差异视图、编辑器、终端 |
| 改动后关闭设置 | 不再弹「未保存的更改」（apply-on-change 类设置已改为即时保存并重置表单基线） |
| 12 项是否都可用 | 全部可用，下拉里没有任何「未安装」标注（截图 `字体-全字族可选无未安装标注.png`）。楷体 / 仿宋 / 圆体 / 兰亭黑 / 隶变 / 行楷 / 魏碑 这 7 项在 macOS 上是系统按需字体，字体文件已在 `System/Library/AssetsV2/com_apple_MobileAsset_Font8/` 里，无需另行下载 |
| 逐项验证渲染（不靠肉眼，量字形宽度） | 同一串预览文字、同为 16 px：宋体 271 px / 楷体 272 px / 隶变 254 px / 魏碑 293 px，四种宽度互不相同且顺序与独立探针测得的字族宽度排序一致（隶变 < 楷体 < 魏碑）；魏碑墨迹像素比楷体多 19%，符合魏碑只有 Bold 一档的实际情况 |
| 视觉复核 | 楷体呈横细竖粗、有提按顿笔；魏碑更粗更方更敦实（截图 `字体-隶变生效.png`、`字体-魏碑生效.png`） |

### 4b. 排版（字重 / 字号 / 字距）

实机操作：设置 → 外观与字体，把界面改成 18 px / 600 / +0.02em、代码改成 15 px，再重启应用。

| 操作 | 实测结果 |
|---|---|
| 界面字号选 18 px | 整窗立刻放大：左侧 16 个面板名、右侧标题与说明、预览卡同时变大；下拉框读回 `18 px` |
| 界面字重选 600 | 全窗文字变半粗（含面板名与正文），下拉框读回 `半粗 600` |
| 界面字距选 +0.02em | 字距拉开，下拉框读回 `宽松 +0.02em` |
| 代码字号选 15 px | 代码预览行变大且与上方正文互不影响；下拉框读回 `15 px` |
| 回读 `settings.json` | `uiFontWeight: 600`、`uiFontSize: 18`、`uiLetterSpacing: 0.02`、`codeFontSize: 15` |
| 退出应用再启动 | 设置页读回 `半粗 600 / 18 px / 宽松 +0.02em / 15 px`，欢迎页同样按 18 px 渲染（启动即生效，不是打开设置才生效） |
| 点「恢复默认排版」 | 五项同时回到 `常规 400 / 16 px / 标准 0 / 常规 400 / 12 px`，按钮变灰；`settings.json` 同步回默认值；界面字族仍是宋体（未被重置） |
| 构建产物 CSS 实测（`getComputedStyle`） | 把构建出的 `index-*.css` 装进浏览器、注入 `--font-ui-size:17px / --font-ui-weight:600 / --font-ui-tracking:0.02em / --font-code-size:16px / --font-code-weight:500` 后实测：根 `17px / 600 / letter-spacing 0.34px`；`pre`、`code`、`.cm-editor`、`.diff-tailwindcss-wrapper` 均 `16px / 500`；`.xterm` 保持根字号（终端字号由 xterm 选项接管，故不参与该规则） |
| 越界值修复 | 手改 `uiFontSize: 3`、`codeFontSize: "18px"`、`uiFontWeight: 700`、`codeFontWeight: 250`、`uiLetterSpacing: 0.5` 后重启：面板读回 `400 / 13 px / 0 / 400 / 12 px`（数值越界夹到区间边界，非数字回默认，枚举外回 400） |

截图：`docs/screenshots/设置-外观与字体-排版.png`（五项控件，默认值）、`docs/screenshots/字体-排版-放大加粗生效.png`（18 px / 600 / +0.02em / 代码 15 px）、`docs/screenshots/字体-排版-重启后保持.png`（退出重开后读回同一组值）。

### 4c. 关闭窗口后点图标唤回（macOS）

上游把「关闭窗口后继续在托盘运行」实现成 `window.hide()`，但事件循环用的是 `.run(context)` 的简写，没有处理 macOS 的 `applicationShouldHandleReopen`（Dock 图标点击、Spotlight、`open -a` 二次启动都走这里）。结果就是：进程还在、窗口对象还在，点图标什么都没发生，只能从菜单栏图标唤回。

修法：改用 `.build(context).run(|app, event| ...)`，接住 `RunEvent::Reopen` 调 `tray::show_main_window`；同时在该函数里先 `app.show()`（`NSApp.unhide`），因为用 Cmd+H 隐藏整个应用时，`window.show()` 对「AppKit 认为仍可见」的窗口是空操作。菜单栏图标、单实例回调、Dock 图标现在共用同一条唤回路径。

| 操作 | 实测结果 |
|---|---|
| 冷启动（`open /Applications/GitDesktop.app`） | 8 秒内出现窗口，进程 pid 与窗口 id 一一对应 |
| 点窗口红点关闭 | 窗口 id 从 `CGWindowList` 消失，进程存活（`closeToTray: true`） |
| 关窗后 `activate`（等同点 Dock 图标） | **窗口回来**，`AXMain=true`（修复前：无窗口、`activate` 无任何效果） |
| 关窗后 `open -a`（等同 Finder 双击图标） | 复用同一实例并唤回窗口，不产生第二个进程 |
| Cmd+H 隐藏整个 app 后点图标 | 窗口恢复并置于最前 |
| 唤回后渲染完整性 | 截图确认欢迎页完整（标题、五个入口、仓库空状态），不是空白或只有框架 |

截图：`docs/screenshots/关闭窗口后点图标唤回.png`。

### 5. 构建与签名

| 项目 | 实测值 |
|---|---|
| .app 产物 | `src/src-tauri/target/release/bundle/macos/GitDesktop.app`，65 MB，`lipo -archs` 实测 **arm64 单架构** |
| DMG 产物 | `src/src-tauri/target/release/bundle/dmg/GitDesktop_0.13.6_aarch64.dmg`，20 MB（20,825,558 字节），sha256 `ea28f7d797d9157d…` |
| DMG 内容 | 挂载后是 `GitDesktop.app` + 指向 `/Applications` 的软链接（拖进去即安装），版本 0.13.6 |
| DMG 与已装版本一致性 | dmg 内二进制 sha256 前 16 位 `e688ddd519257bdb`，与 `/Applications/GitDesktop.app` 完全相同；`strings` 能查到 `applicationShouldHandleReopen`，说明含 4c 的修复 |
| 打包命令 | `pnpm tauri build --bundles app` / `--bundles dmg`；`--bundles dmg` 会先清理旧 `.app`，要两份都留就再跑一次 `--bundles app` |
| 依赖链 | Node 26.8.1 / pnpm 11.22 / Rust 1.99.1（本次装 rustup）/ Xcode CLT |
| 增量重编耗时 | 仅前端改动约 7–9 分钟；只重打 dmg（Rust 无改动）约 3–5 分钟 |
| 签名 | 本地构建 ad-hoc，本机可直接运行；未公证，拷给别人会被 Gatekeeper 拦 |
| 自动更新 | 已关闭（`plugins.updater.endpoints` 置空） |

> 架构更正：此表早先写作「arm64 + x86_64」，与实际不符。`lipo -archs` 对当前产物只返回 `arm64`——本机构建没有做 universal 合并，Intel Mac 上跑不了这份包。

## 七、已知限制

1. 界面汉化是词典级，不是完整 i18n 重构：上游约 1,300 条界面字符串，本词典覆盖约 330 条高频项。深层设置项、罕见对话框、错误提示仍是英文。
2. 内容翻译的默认引擎是浏览器同源接口（Chrome / Edge 的内置翻译后端），不是公开 API：它没有服务条款承诺的稳定性，随时可能改版或限流；改版后需要更新 `engine.ts` 里的解析逻辑。真正长期稳定的做法是在 设置 → AI 填一个模型（或 `claude login` 后用本机 CLI），质量也更高。
3. 段落级替换：翻译期间正文先是英文，译文到达后整体切换，没有逐句流式效果。
4. 表格单元格、极短标签、纯代码行不翻译（有意为之）。
5. 关闭了自动更新（`plugins.updater.endpoints` 置空）：上游更新包会把界面换回英文，且本构建不是用上游签名密钥打的。要更新时重新拉上游源码并按本文档重做改动。
6. 未做代码签名与公证：本地构建为 ad-hoc 签名，本机可直接运行，拷给其他机器会被 Gatekeeper 拦。
7. 本机安装位置已更新：`/Applications/GitDesktop.app` 现在就是本构建（cn.3，含排版设置），上游原版已卸载；原版按指纹备份在 `回滚备份/GitDesktop-upstream-0.13.6-20261021.app`（133 MB），要恢复就把备份 `ditto` 回去。源码树里的 `src/src-tauri/target/release/bundle/macos/GitDesktop.app` 是同一次构建的另一份副本，覆盖安装时以它为准。
8. 界面字体列表里标「未安装」的 7 项（楷体 / 仿宋 / 圆体 / 兰亭黑 / 隶变 / 行楷 / 魏碑）在 macOS 上属于「按需字体」：字体文件由系统托管在 `System/Library/AssetsV2/com_apple_MobileAsset_Font8/`，不在 `/System/Library/Fonts/Supplemental`，所以按文件名去找会觉得「没装」。实测这些字族在 WebKit 布局里都能正常解析并渲染出各自不同的字形，本机不需要额外下载；早期版本把它们标成「未安装」是探测方法错了（见下一条），不是缺字体。
9. 字体可用性探测已从 canvas `measureText` 改为 DOM 布局测宽：WKWebView 里 canvas 对这批按需字族一律返回回退字体的宽度，导致 7 个可用字体被误标；DOM 布局是正文自己走的渲染路径，测出来的结果与用户看到的界面一致。基线也从单一 `monospace` 改成 `monospace / serif / sans-serif` 三条，避免 Menlo 这类「本身就是系统等宽默认」的字族被误判为缺失。
10. 排版设置里「代码字号」对终端只在下次打开终端时生效：xterm 用 canvas 网格渲染，运行中改字号会让已测好的单元格与字形错位，所以不在运行期热更新。字重 300/500 在只有常规+粗体两档的等宽字体（Menlo、Courier New）上会就近取用，这是字族本身的限制，不是设置没生效。

## 八、变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-10-21 | 0.13.6-cn.1 | 初始：界面词典汉化 + 内容翻译（自动/手动/关闭）+ 界面/代码字体切换；翻译引擎由 MyMemory 单引擎改为 AI→Chrome→Bing→Libre→MyMemory 五级链；占位符改 ASCII `[[n]]`；正文硬换行行合并成段落 |
| 2026-10-21 | 0.13.6-cn.2 | 修复 README 图片不显示：相对路径与中文文件名按仓库 raw 内容根重写；翻译管线改成单 token 原子跨度（链接/加粗整体占位、标签单独送译），避免译文重排把链接拆坏；setext 横线不再被并入正文 |
| 2026-10-21 | 0.13.6-cn.2 | 补「六、验收对照表」：界面汉化 / 三档翻译 / 图片 / 字体 / 构建签名共 29 条实机实测记录，逐条附实际返回值；截图 5 张补入 `docs/screenshots/` |
| 2026-10-22 | 0.13.6-cn.3 | 新增排版设置：界面字重 300–600 / 界面字号 13–18 px / 界面字距 −0.01–+0.02em / 代码字重 300–600 / 代码字号 10–16 px，外加「恢复默认排版」；界面字号落在根字号上整窗缩放，代码字号独立（px 绝对值，嵌套不叠缩）；差异视图与编辑器改吃代码字体与代码字号（此前跟随界面字体），终端读同一变量传给 xterm `fontSize`；`settings.json` 新增 5 项并做枚举校验与区间夹取；补「4b. 排版」实测表与截图 |
| 2026-10-22 | 0.13.6-cn.3 | 字体可用性判定改成多基线（monospace / serif / sans-serif 任一宽度有变化即认为已安装），修掉单基线在 Menlo、苹方上的误判；把本构建装到 `/Applications` 并卸载上游原版（原版按 sha256 备份到 `回滚备份/`），装完后在装机版本上复验五项排版控件与字族标注 |
| 2026-10-22 | 0.13.6-cn.4 | 字体探测改用 DOM 布局测宽替代 canvas `measureText`：WKWebView 的 canvas 对系统按需字族一律给回退宽度，导致 楷体/仿宋/圆体/兰亭黑/隶变/行楷/魏碑 7 个可用字体被误标「未安装」；改完后 12 项全部可用、标注清零。查证这 7 项字体文件本就由系统托管在 `System/Library/AssetsV2/`，无需下载（测试期临时拷进 `~/Library/Fonts` 的 375 MB 副本已删除，目录恢复为空）。逐项量字形宽度验证真实生效（宋体 271 / 楷体 272 / 隶变 254 / 魏碑 293 px），并补截图 |
| 2026-10-22 | 0.13.6-cn.5 | 修复「关闭窗口后点 Dock 图标打不开窗口」：事件循环由 `.run(context)` 改为 `.build(...).run(|app, event|)`，接住 macOS `RunEvent::Reopen` 调唤回函数，并在唤回路径先 `app.show()`（`NSApp.unhide`）以覆盖 Cmd+H 隐藏整个应用的情形。菜单栏图标、单实例回调、Dock 图标三处现共用同一条唤回路径；补「4c」实测表与截图 |
| 2026-10-22 | 0.13.6-cn.5 | 出首个 DMG：`bundle/dmg/GitDesktop_0.13.6_aarch64.dmg`（20 MB，sha256 `ea28f7d7…`），挂载核对内含 `GitDesktop.app` + `/Applications` 软链接、版本 0.13.6、二进制与已装版本同源（`e688ddd5…`）、含 Reopen 修复。同时更正文档里的架构说明：实际是 arm64 单架构，不是 universal |
