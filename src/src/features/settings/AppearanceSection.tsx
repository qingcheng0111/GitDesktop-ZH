import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CODE_FONT_LABELS,
  CODE_FONT_ORDER,
  CODE_FONT_SIZE,
  type CodeFontId,
  codeFontStack,
  DEFAULT_TYPOGRAPHY,
  detectFontAvailability,
  FONT_WEIGHT_LABELS,
  FONT_WEIGHT_ORDER,
  type FontAvailability,
  type FontWeightSetting,
  UI_FONT_LABELS,
  UI_FONT_ORDER,
  UI_FONT_SIZE,
  UI_TRACKING_LABELS,
  UI_TRACKING_ORDER,
  type UiFontId,
  type UiTrackingSetting,
  uiFontStack,
} from "@/lib/fonts";
import { applyLocalization } from "@/lib/i18n/apply";
import type { UiLanguage } from "@/lib/i18n/dom";
import type { AppSettings } from "@/lib/settings/api";
import {
  useApplySettingsNow,
  useApplyTheme,
  useSettings,
} from "@/lib/settings/queries";
import { THEME_LABELS, THEME_ORDER, type ThemeSetting } from "@/lib/theme";

const PREVIEW_TEXT = "中文排版示例 Abc 123 — 《字体切换》 0O1lI";
const PREVIEW_CODE = 'fn main() -> Result<()> { println!("中文注释 ok"); }';

/** 13–18 px, one row per step — a slider would be the obvious control, but each
 *  step has to be pickable by name when you are comparing two sizes. */
const UI_SIZE_ITEMS = Object.fromEntries(
  Array.from({ length: UI_FONT_SIZE.max - UI_FONT_SIZE.min + 1 }, (_, i) => {
    const size = UI_FONT_SIZE.min + i;
    return [
      String(size),
      `${size} px${size === UI_FONT_SIZE.default ? "（默认）" : ""}`,
    ];
  }),
);

const CODE_SIZE_ITEMS = Object.fromEntries(
  Array.from(
    { length: CODE_FONT_SIZE.max - CODE_FONT_SIZE.min + 1 },
    (_, i) => {
      const size = CODE_FONT_SIZE.min + i;
      return [
        String(size),
        `${size} px${size === CODE_FONT_SIZE.default ? "（默认）" : ""}`,
      ];
    },
  ),
);

const WEIGHT_ITEMS = Object.fromEntries(
  FONT_WEIGHT_ORDER.map((w) => [String(w), FONT_WEIGHT_LABELS[w]]),
);

const TRACKING_ITEMS = Object.fromEntries(
  UI_TRACKING_ORDER.map((t) => [String(t), UI_TRACKING_LABELS[t]]),
);

/** One labelled dropdown in the typography grid. */
function TypographyField({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          // Base UI hands back null when the selection is cleared; a typography
          // axis has no empty state, so ignore it.
          if (next !== null) onChange(next);
        }}
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([id, text]) => (
            <SelectItem key={id} value={id}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Settings → 外观与字体. Theme, interface language, the two font pickers, and the
 * typography axes (weight / size / tracking) are apply-on-change preferences
 * owned by this control (not the bulk Save bar), mirroring `diffViewMode`: each
 * persists and applies immediately, so every pick previews live.
 *
 * The font pickers mark options this machine cannot resolve. That check exists
 * because the earlier build fell back to the system face whenever a family was
 * absent (思源黑体 on macOS, for one), which read as "the switch does nothing".
 */
export function AppearanceSection() {
  const settings = useSettings();
  const applyTheme = useApplyTheme();
  const applyNow = useApplySettingsNow();
  const labelId = useId();
  const theme = settings.data?.theme ?? "system";
  const language: UiLanguage = settings.data?.uiLanguage ?? "zh-CN";
  const uiFont: UiFontId = settings.data?.uiFont ?? "pingfang";
  const codeFont: CodeFontId = settings.data?.codeFont ?? "jetbrains";
  const uiWeight = settings.data?.uiFontWeight ?? DEFAULT_TYPOGRAPHY.uiWeight;
  const codeWeight =
    settings.data?.codeFontWeight ?? DEFAULT_TYPOGRAPHY.codeWeight;
  const uiSize = settings.data?.uiFontSize ?? UI_FONT_SIZE.default;
  const codeSize = settings.data?.codeFontSize ?? CODE_FONT_SIZE.default;
  const tracking =
    settings.data?.uiLetterSpacing ?? DEFAULT_TYPOGRAPHY.uiTracking;
  const [available, setAvailable] = useState<FontAvailability | null>(null);

  // Canvas measurement needs a live document, so this runs after mount rather
  // than in a render-time initializer. The installed set is fixed per session.
  useEffect(() => {
    setAvailable(detectFontAvailability());
  }, []);

  const uiItems = useMemo(
    () =>
      Object.fromEntries(
        UI_FONT_ORDER.map((id) => [
          id,
          available && !available.ui[id]
            ? `${UI_FONT_LABELS[id]}（未安装）`
            : UI_FONT_LABELS[id],
        ]),
      ) as Record<UiFontId, string>,
    [available],
  );
  const codeItems = useMemo(
    () =>
      Object.fromEntries(
        CODE_FONT_ORDER.map((id) => [
          id,
          available && !available.code[id]
            ? `${CODE_FONT_LABELS[id]}（未安装）`
            : CODE_FONT_LABELS[id],
        ]),
      ) as Record<CodeFontId, string>,
    [available],
  );

  function selectTheme(next: ThemeSetting) {
    if (settings.data) applyTheme(settings.data, next);
  }

  function selectLanguage(next: UiLanguage) {
    if (!settings.data) return;
    // Fonts are re-applied with the language so the localizer's first walk runs
    // against the final face (no double reflow).
    applyLocalization({ ...settings.data, uiLanguage: next });
    applyNow(settings.data, { uiLanguage: next });
  }

  function selectUiFont(next: UiFontId) {
    if (!settings.data) return;
    applyLocalization({ ...settings.data, uiFont: next });
    applyNow(settings.data, { uiFont: next });
  }

  function selectCodeFont(next: CodeFontId) {
    if (!settings.data) return;
    applyLocalization({ ...settings.data, codeFont: next });
    applyNow(settings.data, { codeFont: next });
  }

  /** Every typography axis shares one path: apply to the live document first
   *  (the picker must not wait on the disk write), then persist the patch. */
  function patchTypography(patch: Partial<AppSettings>) {
    if (!settings.data) return;
    applyLocalization({ ...settings.data, ...patch });
    applyNow(settings.data, patch);
  }

  const typographyIsDefault =
    uiWeight === DEFAULT_TYPOGRAPHY.uiWeight &&
    codeWeight === DEFAULT_TYPOGRAPHY.codeWeight &&
    uiSize === DEFAULT_TYPOGRAPHY.uiSize &&
    codeSize === DEFAULT_TYPOGRAPHY.codeSize &&
    tracking === DEFAULT_TYPOGRAPHY.uiTracking;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-sm font-medium">外观</h2>
        <p className="text-xs text-muted-foreground">
          界面主题、语言与字体。更改会立即生效并自动保存。
        </p>
      </div>

      <div className="space-y-1.5">
        <span id={labelId} className="text-xs font-medium">
          主题
        </span>
        <div className="max-w-xs">
          <Select
            items={THEME_LABELS}
            value={theme}
            onValueChange={(value) => selectTheme(value as ThemeSetting)}
          >
            <SelectTrigger aria-labelledby={labelId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEME_ORDER.map((id) => (
                <SelectItem key={id} value={id}>
                  {THEME_LABELS[id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">跟随系统</span>
          会跟着操作系统的浅色/深色设置切换；
          <span className="font-medium text-foreground">石板灰</span>
          是更柔和的深色方案，长时间使用不易刺眼。也可以用命令面板循环切换主题。
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium">界面语言</span>
        <div className="max-w-xs">
          <Select
            items={{ "zh-CN": "简体中文", en: "English（原文）" }}
            value={language}
            onValueChange={(value) => selectLanguage(value as UiLanguage)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh-CN">简体中文</SelectItem>
              <SelectItem value="en">English（原文）</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          内置词典覆盖导航、仓库主视图、探索页、设置与常用对话框；词典未收录的文案保持英文原样，不会被机器翻译成奇怪的措辞。
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium">界面字体</span>
        <div className="max-w-xs">
          <Select
            items={uiItems}
            value={uiFont}
            onValueChange={(value) => selectUiFont(value as UiFontId)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UI_FONT_ORDER.map((id) => (
                <SelectItem key={id} value={id}>
                  {uiItems[id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          className="max-w-md rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
          style={{
            fontFamily: uiFontStack(uiFont),
            fontWeight: uiWeight,
            letterSpacing: tracking === 0 ? undefined : `${tracking}em`,
          }}
        >
          {PREVIEW_TEXT}
        </div>
        <div className="grid max-w-md grid-cols-3 gap-2">
          <TypographyField
            label="字重"
            value={String(uiWeight)}
            items={WEIGHT_ITEMS}
            onChange={(value) =>
              patchTypography({
                uiFontWeight: Number(value) as FontWeightSetting,
              })
            }
          />
          <TypographyField
            label="字号"
            value={String(uiSize)}
            items={UI_SIZE_ITEMS}
            onChange={(value) => patchTypography({ uiFontSize: Number(value) })}
          />
          <TypographyField
            label="字距"
            value={String(tracking)}
            items={TRACKING_ITEMS}
            onChange={(value) =>
              patchTypography({
                uiLetterSpacing: Number(value) as UiTrackingSetting,
              })
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          中文字体自带拉丁字形，所以选宋体、楷体时英文会一起变（苹方的英文接近
          Helvetica，宋体是带衬线的 Times
          风格，楷体偏手写）。标「未安装」的字族本机没有，选中会退回系统字体。
          字号是整份界面的基准值（13–18
          px），列表、侧栏、正文一起缩放；字重与字距对全局生效，个别组件自带的
          加粗不受影响。
        </p>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium">代码字体</span>
        <div className="max-w-xs">
          <Select
            items={codeItems}
            value={codeFont}
            onValueChange={(value) => selectCodeFont(value as CodeFontId)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CODE_FONT_ORDER.map((id) => (
                <SelectItem key={id} value={id}>
                  {codeItems[id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          className="max-w-md overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2"
          style={{
            fontFamily: codeFontStack(codeFont),
            fontSize: codeSize,
            fontWeight: codeWeight,
          }}
        >
          {PREVIEW_CODE}
        </div>
        <div className="grid max-w-md grid-cols-2 gap-2">
          <TypographyField
            label="字重"
            value={String(codeWeight)}
            items={WEIGHT_ITEMS}
            onChange={(value) =>
              patchTypography({
                codeFontWeight: Number(value) as FontWeightSetting,
              })
            }
          />
          <TypographyField
            label="字号"
            value={String(codeSize)}
            items={CODE_SIZE_ITEMS}
            onChange={(value) =>
              patchTypography({ codeFontSize: Number(value) })
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          只作用于代码块、差异视图、编辑器与终端，不影响界面正文；字号是独立的
          px 值（10–16
          px），与界面基准互不牵连。终端按自身网格渲染，字号在下次打开终端时生效。部分等宽字体只有常规与粗体两档，中间字重会就近取用。
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={typographyIsDefault}
          onClick={() =>
            patchTypography({
              uiFontWeight: DEFAULT_TYPOGRAPHY.uiWeight,
              codeFontWeight: DEFAULT_TYPOGRAPHY.codeWeight,
              uiFontSize: DEFAULT_TYPOGRAPHY.uiSize,
              codeFontSize: DEFAULT_TYPOGRAPHY.codeSize,
              uiLetterSpacing: DEFAULT_TYPOGRAPHY.uiTracking,
            })
          }
        >
          恢复默认排版
        </Button>
        <span className="text-xs text-muted-foreground">
          只重置字重、字号与字距，不改字族。
        </span>
      </div>
    </section>
  );
}
