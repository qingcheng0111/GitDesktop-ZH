/**
 * The three content-translation modes, in one place.
 *
 * Kept apart from `store.ts` because the settings schema, the settings panel, and
 * the Markdown hook all need the union without pulling in the cache.
 */

export const CONTENT_TRANSLATION_MODES = ["auto", "manual", "off"] as const;

export type ContentTranslationMode = (typeof CONTENT_TRANSLATION_MODES)[number];

/** Card copy for the Settings panel's three-way switch. */
export const CONTENT_TRANSLATION_CHOICES: {
  id: ContentTranslationMode;
  title: string;
  sub: string;
}[] = [
  { id: "auto", title: "自动", sub: "打开即翻译" },
  { id: "manual", title: "手动", sub: "点按才翻译" },
  { id: "off", title: "关闭", sub: "保持英文" },
];

export const CONTENT_TRANSLATION_LABELS: Record<
  ContentTranslationMode,
  string
> = {
  auto: "自动",
  manual: "手动",
  off: "关闭",
};

export const CONTENT_TRANSLATION_HINTS: Record<ContentTranslationMode, string> =
  {
    auto: "仓库 README、议题与拉取请求正文在渲染后自动译成中文，每篇右上角可一键切回原文。",
    manual:
      "内容保持英文，每段正文右上角出现「翻译为中文」按钮，点一下才翻译。",
    off: "完全不翻译仓库内容，界面汉化不受影响。",
  };
