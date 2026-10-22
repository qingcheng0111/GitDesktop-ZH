/**
 * Post-editing glossary for machine-translated content.
 *
 * Free MT drifts on Git vocabulary: the same word comes back as 存储库 / 代码库 /
 * 仓库 in three consecutive paragraphs, and "pull request" flips between 拉取请求
 * and 合并请求. A short, ordered replacement list applied to every translated
 * segment keeps a README internally consistent without post-editing each line.
 *
 * Longest-first ordering matters: 合并请求 must be rewritten before 请求 is
 * touched by a broader rule.
 */

const POST_EDITS: [from: string, to: string][] = [
  ["存储库", "仓库"],
  ["代码库", "仓库"],
  ["倉庫", "仓库"],
  ["拉请求", "拉取请求"],
  ["提取请求", "拉取请求"],
  ["合并请求", "拉取请求"],
  ["问题单", "议题"],
  ["议题跟踪器", "议题追踪"],
  ["分叉", "复刻"],
  ["派生仓库", "复刻仓库"],
  ["提交请求", "拉取请求"],
  ["代码差异", "差异"],
  ["拉取请求请求", "拉取请求"],
  ["持续集成", "持续集成"],
];

/** Apply the glossary to one translated segment. */
export function postEdit(text: string): string {
  let out = text;
  for (const [from, to] of POST_EDITS) {
    if (from === to) continue;
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

/**
 * Terms left in English on purpose. MT happily renders `npm`, `CLI`, or `Tauri`
 * as transliterations that read worse than the original, so they are restored
 * verbatim after translation.
 */
export const KEEP_VERBATIM = [
  "README",
  "GitHub",
  "GitLab",
  "Bitbucket",
  "Git",
  "npm",
  "pnpm",
  "CLI",
  "API",
  "Rust",
  "Tauri",
  "React",
  "TypeScript",
  "JavaScript",
  "JSON",
  "YAML",
  "HTTP",
  "URL",
  "SSH",
  "MCP",
];
