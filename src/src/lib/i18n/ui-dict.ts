/**
 * UI dictionary for the Chinese-localized build.
 *
 * Why a dictionary instead of a full `t()` refactor: this fork ships one locale
 * (Simplified Chinese) on top of an upstream UI with ~1,300 hard-coded English
 * strings across 790 files. Rewriting every call site would make every upstream
 * merge a conflict, so the UI is localized at the DOM layer instead (`./dom.ts`)
 * with this map as the authority. A missing entry falls through to English —
 * never to machine translation — because MT of short labels produces the usual
 * "存储库 / 代码库 / 仓库" drift that makes a UI look broken.
 *
 * Keys are matched against a text node's trimmed content, so a label that
 * interpolates a count (`3 files`) will not match: those live in `PATTERNS`.
 *
 * Terminology is fixed here once: repository→仓库, branch→分支, commit→提交,
 * pull request→拉取请求, issue→议题, merge→合并, stage→暂存, fetch→获取,
 * push→推送, pull→拉取, stash→贮藏, rebase→变基, remote→远程, tag→标签,
 * release→发行版, workflow→工作流, diff→差异, review→审查.
 */
export const UI_ZH: Record<string, string> = {
  // ── Shell / navigation ────────────────────────────────────────────────
  Repositories: "仓库",
  Repository: "仓库",
  "Open repository": "打开仓库",
  "Clone repository": "克隆仓库",
  "Create repository": "新建仓库",
  "Open a repository": "打开仓库",
  "Back to repositories": "返回仓库列表",
  "No repositories yet": "还没有仓库",
  "Search repositories": "搜索仓库",
  "Double-click to open in browser": "双击在浏览器中打开",
  "Explore repositories": "探索仓库",
  "Repositories list": "仓库列表",
  Explore: "探索",
  Popular: "热门",
  "Your repositories": "我的仓库",
  "Best match": "最佳匹配",
  "Most stars": "最多星标",
  "Recently updated": "最近更新",
  "Load more": "加载更多",
  "My work": "我的工作",
  "All changes": "全部更改",
  Changes: "更改",
  History: "历史",
  PRs: "拉取请求",
  Pulls: "拉取请求",
  "Pull requests": "拉取请求",
  "Pull request": "拉取请求",
  Issues: "议题",
  Issue: "议题",
  Discussions: "讨论",
  Discussion: "讨论",
  Projects: "项目",
  Project: "项目",
  Actions: "工作流",
  "Action runs": "工作流运行",
  Releases: "发行版",
  Release: "发行版",
  Tags: "标签",
  Tag: "标签",
  Branches: "分支",
  Branch: "分支",
  Commits: "提交",
  Commit: "提交",
  Contributors: "贡献者",
  Insights: "洞察",
  Security: "安全",
  Notifications: "通知",
  Settings: "设置",
  "User guide": "使用指南",
  "Open guide": "打开指南",
  Dismiss: "关闭提示",
  Help: "帮助",
  About: "关于",
  General: "通用",
  Appearance: "外观",
  "Slash commands": "斜杠命令",
  "MCP servers": "MCP 服务器",
  Automations: "自动化",
  Keyboard: "快捷键",
  Accounts: "账号",
  Syntax: "语法高亮",
  "External editor": "外部编辑器",
  Terminal: "终端",
  Updates: "更新",
  "Check for updates": "检查更新",
  "Open in editor": "在编辑器中打开",
  "Open in terminal": "在终端中打开",
  "Show in Finder": "在访达中显示",
  "Show in Explorer": "在资源管理器中显示",
  "Copy path": "复制路径",

  // ── Common verbs / buttons ────────────────────────────────────────────
  Cancel: "取消",
  Close: "关闭",
  Save: "保存",
  "Save changes": "保存更改",
  "Save and close": "保存并关闭",
  Discard: "放弃",
  Delete: "删除",
  Remove: "移除",
  Edit: "编辑",
  Rename: "重命名",
  Add: "添加",
  New: "新建",
  Create: "创建",
  Open: "打开",
  Back: "返回",
  Next: "下一步",
  Previous: "上一步",
  Continue: "继续",
  Done: "完成",
  Apply: "应用",
  Confirm: "确认",
  Copy: "复制",
  "Copy link": "复制链接",
  "Copy SHA": "复制 SHA",
  "Copy branch name": "复制分支名",
  "Copy command": "复制命令",
  "Copy markdown": "复制 Markdown",
  Paste: "粘贴",
  Cut: "剪切",
  Undo: "撤销",
  Redo: "重做",
  Refresh: "刷新",
  Reload: "重新加载",
  Retry: "重试",
  "Try again": "重试",
  Restart: "重启",
  Resume: "恢复",
  Stop: "停止",
  Abort: "中止",
  Skip: "跳过",
  Keep: "保留",
  Clear: "清空",
  Search: "搜索",
  Filter: "筛选",
  Sort: "排序",
  View: "视图",
  "View options": "视图选项",
  "More actions": "更多操作",
  Details: "详情",
  Preview: "预览",
  Name: "名称",
  Title: "标题",
  Description: "描述",
  Labels: "标签",
  "Add label": "添加标签",
  "Add labels": "添加标签",
  Assignees: "负责人",
  Reviewers: "审查者",
  Milestone: "里程碑",
  Author: "作者",
  Date: "日期",
  Status: "状态",
  Type: "类型",
  Size: "大小",
  Path: "路径",
  Folder: "文件夹",
  File: "文件",
  Files: "文件",
  "No items": "暂无内容",
  None: "无",
  Unknown: "未知",
  Loading: "加载中",
  "Loading…": "加载中…",
  "No results": "没有结果",
  "No results found": "没有找到结果",
  "No description provided.": "没有提供描述。",
  "No comments yet.": "还没有评论。",
  Draft: "草稿",
  "Mark resolved": "标记为已解决",
  Resolved: "已解决",
  Closed: "已关闭",
  Merged: "已合并",
  Active: "活跃",
  Archived: "已归档",
  "Pre-release": "预发行版",
  Latest: "最新",
  Default: "默认",
  "Default branch": "默认分支",
  "Don't show again": "不再显示",
  "Quote reply": "引用回复",
  "Link issue": "关联议题",
  "Create local issue": "创建本地议题",
  "New task": "新任务",
  "View on GitHub": "在 GitHub 上查看",
  Star: "星标",
  Fork: "复刻",
  Clone: "克隆",
  "Sign in": "登录",
  "Sign out": "退出登录",
  Disconnect: "断开连接",
  Reconnect: "重新连接",
  Connect: "连接",
  "Set up": "设置",
  "Set up AI": "配置 AI",
  Test: "测试",
  "Test connection": "测试连接",
  Generate: "生成",
  "Draft with AI": "用 AI 起草",
  Summarize: "总结",
  Translate: "翻译",
  "Show original": "显示原文",
  "Show translation": "显示译文",
  "Translating…": "翻译中…",
  "Translation failed": "翻译失败",

  // ── Welcome screen ───────────────────────────────────────────────────
  "The whole loop,": "完整流程，",
  "one window.": "一个窗口。",
  "Open a repository to start reviewing, committing, and shipping — with AI in the loop when you want it.":
    "打开一个仓库，即可开始审查、提交与发布 —— 需要时还能让 AI 参与其中。",
  // Same sentence, split across two text nodes by JSX interpolation
  // (`{aiEnabled ? " — with AI…" : "."}`), so each half needs its own entry.
  "Open a repository to start reviewing, committing, and shipping":
    "打开一个仓库，即可开始审查、提交与发布",
  "— with AI in the loop when you want it.": "—— 需要时还能让 AI 参与其中。",

  // ── Settings: General ────────────────────────────────────────────────
  "App-wide preferences.": "应用级偏好设置。",
  "Hide AI features": "隐藏 AI 功能",
  "Keep running in the tray when the window is closed":
    "关闭窗口后继续在托盘运行",
  "Automatically fetch from your remotes": "自动从远程获取",
  "Every 10 minutes": "每 10 分钟",
  "Every 5 minutes": "每 5 分钟",
  "Every 30 minutes": "每 30 分钟",
  "Every hour": "每小时",
  "Automatically stash and reapply on pull, merge, rebase, and branch updates":
    "拉取、合并、变基与分支更新时自动贮藏并重新应用",
  "Reapply stashed changes after switching branches":
    "切换分支后重新应用贮藏的更改",
  "Show the multi-select hint above the changes list":
    "在更改列表上方显示多选提示",
  "Confirm before amending a pushed commit": "修补已推送的提交前先确认",
  "…or drag a repo folder anywhere onto the window.":
    "…也可以把仓库文件夹直接拖到窗口里。",
  "Open, clone, or create a repository and it'll show up here for quick access.":
    "打开、克隆或新建一个仓库，它就会出现在这里，方便快速进入。",
  "New to GitDesktop? The built-in guide walks through the whole workflow.":
    "第一次使用 GitDesktop？内置指南会带你走完整个流程。",
  "GitDesktop sends anonymous usage data": "GitDesktop 会发送匿名使用数据",
  "No code, paths, or secrets — and no session recordings unless you opt in. Manage in Settings → General.":
    "不包含代码、路径或密钥；除非你主动开启，否则不录制会话。可在 设置 → 通用 中管理。",
  "Turn off": "关闭",

  // ── Explore / repo detail ───────────────────────────────────────────
  "Select a repository": "选择一个仓库",
  "Pick a repository from the list to preview its README and clone, fork, or star it.":
    "从列表中选择一个仓库，即可预览它的 README，并进行克隆、复刻或星标。",
  "No repositories match.": "没有匹配的仓库。",
  "Search results": "搜索结果",
  "Private repository": "私有仓库",
  "Public repository": "公开仓库",
  stars: "星标",
  "Last updated": "最近更新",
  Language: "语言",
  License: "许可证",
  Topics: "话题",
  Homepage: "主页",
  "Clone URL": "克隆地址",
  "Failed to load": "加载失败",
  "Something went wrong": "出了点问题",
  "Try reloading": "试着重新加载",

  // ── Repository view ─────────────────────────────────────────────────
  "Working tree": "工作区",
  "Staged changes": "已暂存的更改",
  "Unstaged changes": "未暂存的更改",
  "Stage all": "全部暂存",
  "Unstage all": "全部取消暂存",
  "Stage file": "暂存文件",
  "Unstage file": "取消暂存文件",
  "Discard changes": "放弃更改",
  "Commit message": "提交信息",
  "Commit message (required)": "提交信息（必填）",
  "Commit to": "提交到",
  "Amend last commit": "修补上一次提交",
  "Push origin": "推送到 origin",
  "Pull origin": "从 origin 拉取",
  "Fetch origin": "从 origin 获取",
  "Create branch": "新建分支",
  "Delete branch": "删除分支",
  "Checkout branch": "检出分支",
  "Merge into current branch": "合并到当前分支",
  "Rebase onto": "变基到",
  "Stash changes": "贮藏更改",
  "Pop stash": "弹出贮藏",
  "No local changes": "没有本地更改",
  "No commits yet": "还没有提交",
  "Nothing to commit": "没有可提交的内容",
  "Up to date": "已是最新",
  Behind: "落后",
  Ahead: "领先",
  "Ahead of": "领先于",
  "Behind by": "落后",
  "files changed": "个文件已更改",
  "Show diff": "显示差异",
  "Split view": "分栏视图",
  "Unified view": "统一视图",
  "Hide whitespace": "忽略空白字符",
  "New file": "新文件",
  "Deleted file": "已删除文件",
  "Renamed file": "已重命名文件",
  "Binary file": "二进制文件",
  "Large file": "大文件",

  // ── Pull requests / issues ──────────────────────────────────────────
  "New pull request": "新建拉取请求",
  "Create pull request": "创建拉取请求",
  "Merge pull request": "合并拉取请求",
  "Close pull request": "关闭拉取请求",
  Reopen: "重新打开",
  Approve: "批准",
  "Request changes": "请求修改",
  "Add comment": "添加评论",
  Comment: "评论",
  Comments: "评论",
  Review: "审查",
  Checks: "检查",
  "Checks passing": "检查通过",
  "Checks failing": "检查失败",
  "Checks cancelled": "检查已取消",
  Conversation: "对话",
  "Changed files": "更改的文件",
  "Merge when ready": "就绪后合并",
  "Squash and merge": "压缩合并",
  "Rebase and merge": "变基合并",
  "Create merge commit": "创建合并提交",
  "Ready for review": "等待审查",
  "Convert to draft": "转为草稿",

  // ── Settings — general / appearance ─────────────────────────────────
  "How GitDesktop looks. Changes apply immediately.":
    "GitDesktop 的外观。更改会立即生效。",
  Theme: "主题",
  System: "跟随系统",
  Light: "浅色",
  Dark: "深色",
  Slate: "石板灰（柔和深色）",
  "Interface font": "界面字体",
  "Code font": "代码字体",
  "Interface language": "界面语言",
  "Content translation": "内容翻译",
  "Translation engine": "翻译引擎",
  Auto: "自动",
  Manual: "手动",
  Off: "关闭",
  "Chinese (Simplified)": "简体中文",
  English: "English",
  "Translation service": "翻译服务",
  "The built-in dictionary always applies first; the engine below only handles text it does not cover.":
    "内置词典始终优先；下面的引擎只处理词典未覆盖的文本。",
  "Automatic translation": "自动翻译",
  "Translate on open": "打开即翻译",
  "Translate on demand": "按需翻译",
  "Never translate": "从不翻译",
  "Clear translation cache": "清空翻译缓存",
  "Cache cleared": "缓存已清空",
  "Saved translations": "已保存的译文",
  "Built-in dictionary": "内置词典",
  "Free online translation (no key)": "免费在线翻译（无需密钥）",
  "Your configured AI model": "你配置的 AI 模型",
};

/**
 * Patterns for labels the app builds at runtime (counts, names, timestamps).
 * Ordered: the first match wins. Each maps to a replacement where `$1`-style
 * groups from the source regex are reused.
 */
export const UI_ZH_PATTERNS: { re: RegExp; to: (...m: string[]) => string }[] =
  [
    { re: /^(\d+) files? changed$/, to: (_m, n) => `${n} 个文件已更改` },
    { re: /^(\d+) commits?$/, to: (_m, n) => `${n} 个提交` },
    { re: /^(\d+) comments?$/, to: (_m, n) => `${n} 条评论` },
    { re: /^(\d+) files?$/, to: (_m, n) => `${n} 个文件` },
    { re: /^(\d+) branches?$/, to: (_m, n) => `${n} 个分支` },
    { re: /^(\d+) issues?$/, to: (_m, n) => `${n} 个议题` },
    { re: /^(\d+) open$/, to: (_m, n) => `${n} 个未关闭` },
    { re: /^(\d+) closed$/, to: (_m, n) => `${n} 个已关闭` },
    { re: /^(\d+) stars?$/, to: (_m, n) => `${n} 星标` },
    { re: /^(\d+) forks?$/, to: (_m, n) => `${n} 复刻` },
    { re: /^Updated (.+)$/, to: (_m, t) => `更新于 ${t}` },
    { re: /^Opened by (.+)$/, to: (_m, t) => `由 ${t} 打开` },
    { re: /^Merged by (.+)$/, to: (_m, t) => `由 ${t} 合并` },
    { re: /^Assigned to (.+)$/, to: (_m, t) => `指派给 ${t}` },
    {
      re: /^(.+) wants to merge (\d+) commits? into (.+)$/,
      to: (_m, a, n, b) => `${a} 想把 ${n} 个提交合并到 ${b}`,
    },
  ];

/** Translate one already-trimmed UI string, or `undefined` when the dictionary
 *  has nothing for it (the caller then leaves the English text alone). */
export function translateUiString(text: string): string | undefined {
  const direct = UI_ZH[text];
  if (direct) return direct;
  // Typography drift: the same sentence reaches the DOM with an em dash, a curly
  // apostrophe, a non-breaking space, or a line-wrap-inserted space. Comparing on
  // a normalised key catches those without duplicating every entry.
  const normalized = normalize(text);
  if (normalized !== text) {
    const hit = NORMALIZED[normalized];
    if (hit) return hit;
  }
  for (const { re, to } of UI_ZH_PATTERNS) {
    const m = re.exec(text);
    if (m) return to(...(m as unknown as string[]));
  }
  return undefined;
}

/** Fold the typographic variants that differ between the source file and the DOM. */
function normalize(text: string): string {
  return text
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Built once from {@link UI_ZH}, keyed by the normalised form. */
const NORMALIZED: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [en, zh] of Object.entries(UI_ZH)) {
    const key = normalize(en);
    if (!(key in out)) out[key] = zh;
  }
  return out;
})();
