import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApplySettingsNow, useSettings } from "@/lib/settings/queries";
import {
  TRANSLATION_ENGINES,
  type TranslationEngineId,
  translateSegments,
} from "@/lib/translate/engine";
import {
  CONTENT_TRANSLATION_CHOICES,
  CONTENT_TRANSLATION_HINTS,
  type ContentTranslationMode,
} from "@/lib/translate/mode";
import {
  clearTranslationCache,
  subscribeTranslations,
  translationCacheSize,
  translationVersion,
} from "@/lib/translate/store";

/** A plain sentence: no placeholders, so the result reads as real output. */
const SAMPLE =
  "Run the command below to install the CLI, then open your repository.";

/**
 * Settings → 内容翻译.
 *
 * The three modes are the feature's contract, so they are laid out as three
 * visible choices rather than a menu: 自动 translates repository bodies as they
 * render, 手动 leaves them English behind a per-document button, 关闭 disables
 * content translation entirely (interface localization is a separate setting
 * and keeps working).
 */
export function TranslationSection() {
  const settings = useSettings();
  const applyNow = useApplySettingsNow();
  const mode: ContentTranslationMode =
    settings.data?.contentTranslation ?? "auto";
  const engine: TranslationEngineId =
    settings.data?.translationEngine ?? "auto";
  // Cache size is derived from a module-level Map, so the panel subscribes to
  // the same version signal the Markdown surfaces use.
  const version = useSyncExternalStore(
    subscribeTranslations,
    translationVersion,
    translationVersion,
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: version invalidates the size read
  const cacheCount = useMemo(() => translationCacheSize(), [version]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  function selectMode(next: ContentTranslationMode) {
    if (!settings.data) return;
    applyNow(settings.data, { contentTranslation: next });
  }

  function selectEngine(next: TranslationEngineId) {
    if (!settings.data) return;
    applyNow(settings.data, { translationEngine: next });
  }

  async function runTest() {
    if (!settings.data) return;
    setTesting(true);
    setTestResult(null);
    try {
      const { texts, engine: used } = await translateSegments([SAMPLE], {
        engine,
        ai: settings.data.ai,
      });
      setTestResult(
        (() => {
          const out = texts[0] ?? "";
          const engineLabel =
            used === "ai"
              ? "AI 模型"
              : used === "google"
                ? "浏览器同源翻译"
                : used === "bing"
                  ? "必应翻译"
                  : used === "libre"
                    ? "LibreTranslate"
                    : used === "mymemory"
                      ? "MyMemory"
                      : "未调用";
          return /[\u4e00-\u9fff]/.test(out)
            ? `${out}（引擎：${engineLabel}）`
            : `没有拿到译文，当前引擎不可用或额度已满。原样返回：${out}`;
        })(),
      );
    } catch (err) {
      setTestResult(
        `失败：${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-sm font-medium">内容翻译</h2>
        <p className="text-xs text-muted-foreground">
          把仓库里的英文（README、议题、拉取请求、讨论正文）译成中文。界面汉化不受这里的开关影响。
        </p>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium">翻译模式</span>
        <div className="grid grid-cols-3 gap-2">
          {CONTENT_TRANSLATION_CHOICES.map(({ id, title, sub }) => {
            const active = id === mode;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => selectMode(id)}
                className={[
                  "cursor-pointer rounded-md border px-3 py-2 text-left text-xs transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                <span className="block font-medium">{title}</span>
                <span className="mt-0.5 block text-[11px] opacity-80">
                  {sub}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {CONTENT_TRANSLATION_HINTS[mode]}
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium">翻译引擎</span>
        <div className="max-w-md">
          <Select
            items={Object.fromEntries(
              TRANSLATION_ENGINES.map((e) => [e.id, e.label]),
            )}
            value={engine}
            onValueChange={(value) =>
              selectEngine(value as TranslationEngineId)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSLATION_ENGINES.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          「自动」先试 设置 → AI
          里配置的模型（质量最好），再退到浏览器同源的翻译接口（与 Chrome
          右键翻译同一后端），最后才用必应与开源接口兜底。都不需要密钥；连续翻译大量文档时若被限流，稍后重试即可。
        </p>
      </div>

      <div className="space-y-2 rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium">已缓存的译文</p>
            <p className="text-[11px] text-muted-foreground">
              {cacheCount} 篇。译文缓存在本机，重开同一个仓库不会再走一遍网络。
            </p>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted"
            onClick={() => {
              clearTranslationCache();
              setTestResult(null);
            }}
          >
            清空缓存
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={testing}
            className="cursor-pointer rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground disabled:opacity-60"
            onClick={() => void runTest()}
          >
            {testing ? "测试中…" : "测试翻译"}
          </button>
          <span className="text-[11px] text-muted-foreground">
            用一句带行内代码与链接的样例验证当前引擎是否可用。
          </span>
        </div>
        {testResult && (
          <p className="rounded bg-muted px-2 py-1.5 text-[11px] break-words">
            {testResult}
          </p>
        )}
      </div>
    </section>
  );
}
