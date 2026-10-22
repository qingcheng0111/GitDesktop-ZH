/**
 * Font presets for the Chinese-localized build (`Settings → 外观与字体`).
 *
 * Two independent axes, because they answer different needs:
 *  - 界面字体 — the face the whole chrome, body text, and Markdown render in.
 *  - 代码字体 — code blocks, the diff surface, the editor, and the terminal.
 *
 * Every stack is CJK-face-first. A Chinese font ships its own Latin glyphs (苹方's
 * are Helvetica-like, 宋体's are a Times-ish serif, 楷体's a brushy serif), so
 * putting the Chinese family first is what makes English text change appearance
 * together with the Chinese — which is what a reader expects when they pick a
 * face. The `system` entry is the exception: it deliberately lets the platform's
 * Latin face win and falls back to the CJK face per glyph.
 *
 * No font files are bundled: every entry is a system face, except JetBrains Mono
 * which already ships with the app via `@fontsource`. Entries whose primary
 * family is missing on this machine are detected at runtime
 * ({@link detectFontAvailability}) and greyed out in the picker instead of
 * silently falling back — the "I picked a font and nothing happened" complaint
 * this replaced.
 */

/** Faces offered for the interface. */
export const UI_FONT_ORDER = [
  "pingfang",
  "heiti",
  "songti",
  "kaiti",
  "fangsong",
  "yuanti",
  "hiragino",
  "lantinghei",
  "libian",
  "xingkai",
  "weibei",
  "system",
] as const;

export type UiFontId = (typeof UI_FONT_ORDER)[number];

/** Faces offered for code blocks, the editor, and the terminal. */
export const CODE_FONT_ORDER = [
  "jetbrains",
  "menlo",
  "sfmono",
  "monaco",
  "consolas",
  "courier",
  "mono",
] as const;

export type CodeFontId = (typeof CODE_FONT_ORDER)[number];

/** Human labels for the pickers (Chinese — this build's UI language). */
export const UI_FONT_LABELS: Record<UiFontId, string> = {
  pingfang: "苹方 萍方（默认）",
  heiti: "黑体",
  songti: "宋体",
  kaiti: "楷体",
  fangsong: "仿宋",
  yuanti: "圆体",
  hiragino: "冬青黑体",
  lantinghei: "兰亭黑",
  libian: "隶变",
  xingkai: "行楷",
  weibei: "魏碑",
  system: "系统默认（英文 SF Pro / 雅黑）",
};

export const CODE_FONT_LABELS: Record<CodeFontId, string> = {
  jetbrains: "JetBrains Mono（内置）",
  menlo: "Menlo",
  sfmono: "SF Mono",
  monaco: "Monaco",
  consolas: "Consolas",
  courier: "Courier New",
  mono: "系统等宽",
};

/**
 * The family each entry is *judged* by (the first one that must exist for the
 * option to look right), plus the full stack used in CSS. Keeping them separate
 * lets an entry fall back on Windows without its availability check lying.
 */
const UI_FONT_STACKS: Record<UiFontId, string> = {
  pingfang:
    '"PingFang SC", "PingFang HK", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
  heiti:
    '"Heiti SC", "STHeiti", "Microsoft YaHei", "SimHei", "Noto Sans CJK SC", sans-serif',
  songti:
    '"Songti SC", "STSong", "SimSun", "Noto Serif CJK SC", "PingFang SC", serif',
  kaiti:
    '"Kaiti SC", "STKaiti", "KaiTi", "Noto Serif CJK SC", "PingFang SC", serif',
  fangsong:
    '"STFangsong", "FangSong", "Songti SC", "SimSun", "Noto Serif CJK SC", serif',
  yuanti:
    '"Yuanti SC", "STYuanti", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
  hiragino:
    '"Hiragino Sans GB", "Hiragino Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
  lantinghei:
    '"Lantinghei SC", "STHeiti", "PingFang SC", "Microsoft YaHei", sans-serif',
  libian: '"Libian SC", "Libian TC", "Songti SC", "KaiTi", "Songti SC", serif',
  xingkai: '"Xingkai SC", "STXingkai", "Kaiti SC", "KaiTi", serif',
  weibei: '"Weibei SC", "Weibei TC", "Songti SC", "SimSun", serif',
  system:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
};

/** The family name used for the "is this installed?" probe. */
const UI_FONT_PRIMARY: Record<UiFontId, string> = {
  pingfang: "PingFang SC",
  heiti: "Heiti SC",
  songti: "Songti SC",
  kaiti: "Kaiti SC",
  fangsong: "STFangsong",
  yuanti: "Yuanti SC",
  hiragino: "Hiragino Sans GB",
  lantinghei: "Lantinghei SC",
  libian: "Libian SC",
  xingkai: "Xingkai SC",
  weibei: "Weibei SC",
  system: "",
};

const CODE_FONT_STACKS: Record<CodeFontId, string> = {
  jetbrains:
    '"JetBrains Mono Variable", "JetBrains Mono", "PingFang SC", monospace',
  menlo: 'Menlo, "PingFang SC", monospace',
  sfmono: '"SF Mono", Menlo, "PingFang SC", monospace',
  monaco: 'Monaco, Menlo, "PingFang SC", monospace',
  consolas: 'Consolas, Menlo, "Microsoft YaHei", monospace',
  courier: '"Courier New", Courier, Menlo, monospace',
  mono: 'ui-monospace, SFMono-Regular, Menlo, "PingFang SC", monospace',
};

const CODE_FONT_PRIMARY: Record<CodeFontId, string> = {
  jetbrains: "JetBrains Mono Variable",
  menlo: "Menlo",
  sfmono: "SF Mono",
  monaco: "Monaco",
  consolas: "Consolas",
  courier: "Courier New",
  mono: "",
};

/** Whether `value` is a UI face this build knows (heals a stale stored id). */
export function isUiFont(value: unknown): value is UiFontId {
  return (
    typeof value === "string" &&
    (UI_FONT_ORDER as readonly string[]).includes(value)
  );
}

/** Whether `value` is a code face this build knows (heals a stale stored id). */
export function isCodeFont(value: unknown): value is CodeFontId {
  return (
    typeof value === "string" &&
    (CODE_FONT_ORDER as readonly string[]).includes(value)
  );
}

/**
 * Is a family actually installed? Measured, not guessed: lay out the same
 * string first with the family in front of a fallback, then with the fallback
 * alone, and compare widths. A missing family changes nothing, so the widths
 * match.
 *
 * Measured through DOM layout (`getBoundingClientRect`), NOT through canvas
 * `measureText` — that was the original implementation and it silently lied in
 * WKWebView: every CJK face macOS ships as an on-demand asset (楷体, 隶变,
 * 行楷, 魏碑, 兰亭黑, 圆体, 仿宋) renders correctly in layout but measures at
 * fallback width on a canvas, so the picker labelled seven working fonts
 * 「未安装」. Layout is the path the document itself uses, so it cannot disagree
 * with what the user sees.
 *
 * Compared against THREE fallbacks, because a single baseline lies in both
 * directions: Menlo *is* the macOS `monospace` default (widths match → a false
 * "未安装"), and 苹方's Latin glyphs happen to size like `sans-serif`'s. A
 * family counts as present when it changes the width against any fallback.
 */
const PROBE_TEXT = "mmmmmWWWWiiiii中文字体测试";
const PROBE_BASES = ["monospace", "serif", "sans-serif"] as const;

let probeEl: HTMLSpanElement | null = null;
let probeBaseWidths: Record<string, number> | null = null;

/** Width of {@link PROBE_TEXT} under `fontFamily`, in an off-screen span. */
function widthOf(fontFamily: string, size = 24): number {
  if (!probeEl) {
    const el = document.createElement("span");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText =
      "position:absolute;left:-9999px;top:-9999px;visibility:hidden;" +
      "white-space:nowrap;pointer-events:none";
    document.body.appendChild(el);
    probeEl = el;
  }
  probeEl.style.fontSize = `${size}px`;
  probeEl.style.fontFamily = fontFamily;
  probeEl.textContent = PROBE_TEXT;
  return probeEl.getBoundingClientRect().width;
}

function baseWidths(): Record<string, number> {
  if (!probeBaseWidths) {
    probeBaseWidths = Object.fromEntries(
      PROBE_BASES.map((base) => [base, widthOf(base)]),
    );
  }
  return probeBaseWidths;
}

function installed(family: string): boolean {
  if (!family) return true;
  const bases = baseWidths();
  return PROBE_BASES.some(
    (base) => Math.abs(widthOf(`"${family}", ${base}`) - bases[base]) > 0.5,
  );
}

export interface FontAvailability {
  ui: Record<UiFontId, boolean>;
  code: Record<CodeFontId, boolean>;
}

/** Families this build ships itself — always present, and invisible to the
 *  Canvas probe until the webfont finishes loading. */
const BUNDLED_CODE_FONTS = new Set<CodeFontId>(["jetbrains"]);

/** Which options resolve to a face that exists on this machine. */
export function detectFontAvailability(): FontAvailability {
  if (typeof document === "undefined") {
    // Server/pre-hydration path: claim everything so the picker renders every
    // option; the client recomputes on mount.
    const all = (ids: readonly string[]) =>
      Object.fromEntries(ids.map((id) => [id, true])) as Record<
        string,
        boolean
      >;
    return {
      ui: all(UI_FONT_ORDER) as Record<UiFontId, boolean>,
      code: all(CODE_FONT_ORDER) as Record<CodeFontId, boolean>,
    };
  }
  const ui = {} as Record<UiFontId, boolean>;
  for (const id of UI_FONT_ORDER) ui[id] = installed(UI_FONT_PRIMARY[id]);
  const code = {} as Record<CodeFontId, boolean>;
  for (const id of CODE_FONT_ORDER) {
    // JetBrains Mono ships with the app via `@fontsource`, so it is always
    // there — and the Canvas probe can miss it while the webfont is still
    // loading, which would wrongly label the default as 未安装.
    code[id] = BUNDLED_CODE_FONTS.has(id) || installed(CODE_FONT_PRIMARY[id]);
  }
  return { ui, code };
}

/**
 * Push the chosen faces onto the document.
 *
 * `--font-ui` is what `App.css`'s `html` rule consumes — it has to be a real
 * `var()` reference there, because Tailwind's `@theme inline` inlines the value
 * at build time (`html { @apply font-mono }` compiled to the literal
 * `font-family: JetBrains Mono Variable, monospace`, so swapping `--font-mono`
 * never reached the document). `--font-mono` is still updated, because theme
 * tokens that DO emit `var(--font-mono)` (`.font-heading`) should follow the
 * same choice.
 */
export function applyFonts(ui: UiFontId, code: CodeFontId): void {
  const root = document.documentElement;
  const uiStack = UI_FONT_STACKS[ui] ?? UI_FONT_STACKS.pingfang;
  const codeStack = CODE_FONT_STACKS[code] ?? CODE_FONT_STACKS.jetbrains;
  root.style.setProperty("--font-ui", uiStack);
  root.style.setProperty("--font-mono", uiStack);
  root.style.setProperty("--font-sans", uiStack);
  root.style.setProperty("--font-code", codeStack);
  root.dataset.uiFont = ui;
  root.dataset.codeFont = code;
}

/** The CSS stack for a UI face (used by the picker's live preview). */
export function uiFontStack(id: UiFontId): string {
  return UI_FONT_STACKS[id] ?? UI_FONT_STACKS.pingfang;
}

/** The CSS stack for a code face (used by the picker's live preview). */
export function codeFontStack(id: CodeFontId): string {
  return CODE_FONT_STACKS[id] ?? CODE_FONT_STACKS.jetbrains;
}

/* ── Typography: weight, size, tracking ────────────────────────────────────
   A face alone is a blunt instrument: 苹方 at 300/13px reads nothing like 苹方
   at 500/17px, and a diff at 11px is unreadable on a Retina panel. These three
   axes are what people actually reach for when "the font is wrong" means size
   or weight rather than family.

   Sizes are two independent numbers, not one scale factor:
     · 界面字号 is the document root size — every Tailwind size is rem-based, so
       one number rescales the whole chrome coherently.
     · 代码字号 is an absolute px value on the code surfaces. Absolute (not em)
       so a nested `<pre><code>` can't compound into half-size text, and
       independent so code can grow without bloating the chrome. */

/** Weight steps offered for both faces. 300/500/600 are no-ops on faces that
 *  only ship regular+bold (Menlo, Courier) — the browser snaps to the nearest
 *  available weight, which is the honest behaviour rather than a lie in the UI. */
export const FONT_WEIGHT_ORDER = [300, 400, 500, 600] as const;
export type FontWeightSetting = (typeof FONT_WEIGHT_ORDER)[number];

export const FONT_WEIGHT_LABELS: Record<FontWeightSetting, string> = {
  300: "细体 300",
  400: "常规 400（默认）",
  500: "中黑 500",
  600: "半粗 600",
};

/** Document root size, px. Below 13 the sidebar labels start to clip; above 18
 *  the fixed-width diff gutters stop lining up. */
export const UI_FONT_SIZE = { min: 13, max: 18, default: 16 } as const;
/** Code surface size, px. */
export const CODE_FONT_SIZE = { min: 10, max: 16, default: 12 } as const;

/** Tracking in em — positive opens up dense 汉字, negative tightens Latin-heavy
 *  chrome. Kept to four steps: fine-grained tracking is a typographer's tool,
 *  and every step here has to stay readable at 13px. */
export const UI_TRACKING_ORDER = [-0.01, 0, 0.01, 0.02] as const;
export type UiTrackingSetting = (typeof UI_TRACKING_ORDER)[number];

export const UI_TRACKING_LABELS: Record<UiTrackingSetting, string> = {
  "-0.01": "紧凑 −0.01em",
  "0": "标准 0（默认）",
  "0.01": "舒展 +0.01em",
  "0.02": "宽松 +0.02em",
};

export interface Typography {
  uiWeight: FontWeightSetting;
  codeWeight: FontWeightSetting;
  uiSize: number;
  codeSize: number;
  uiTracking: UiTrackingSetting;
}

export const DEFAULT_TYPOGRAPHY: Typography = {
  uiWeight: 400,
  codeWeight: 400,
  uiSize: UI_FONT_SIZE.default,
  codeSize: CODE_FONT_SIZE.default,
  uiTracking: 0,
};

export function isFontWeight(value: unknown): value is FontWeightSetting {
  return (
    typeof value === "number" &&
    (FONT_WEIGHT_ORDER as readonly number[]).includes(value)
  );
}

export function isUiTracking(value: unknown): value is UiTrackingSetting {
  return (
    typeof value === "number" &&
    (UI_TRACKING_ORDER as readonly number[]).includes(value)
  );
}

/** Clamp a stored px size into `bounds`, healing junk (strings, NaN, a value
 *  from a future build) to the default instead of rendering 3px text. */
export function clampFontSize(
  value: unknown,
  bounds: { min: number; max: number; default: number },
): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    return bounds.default;
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
}

/**
 * Push weight/size/tracking onto the document.
 *
 * Everything lands as a custom property on `<html>` rather than as an inline
 * `font-size`, so `App.css` stays the single place that says which surfaces
 * consume which axis — the same reason the family stacks are variables.
 */
export function applyTypography(typography: Typography): void {
  const root = document.documentElement;
  const uiWeight = isFontWeight(typography.uiWeight)
    ? typography.uiWeight
    : DEFAULT_TYPOGRAPHY.uiWeight;
  const codeWeight = isFontWeight(typography.codeWeight)
    ? typography.codeWeight
    : DEFAULT_TYPOGRAPHY.codeWeight;
  const uiSize = clampFontSize(typography.uiSize, UI_FONT_SIZE);
  const codeSize = clampFontSize(typography.codeSize, CODE_FONT_SIZE);
  const tracking = isUiTracking(typography.uiTracking)
    ? typography.uiTracking
    : DEFAULT_TYPOGRAPHY.uiTracking;

  root.style.setProperty("--font-ui-weight", String(uiWeight));
  root.style.setProperty("--font-code-weight", String(codeWeight));
  root.style.setProperty("--font-ui-size", `${uiSize}px`);
  root.style.setProperty("--font-code-size", `${codeSize}px`);
  root.style.setProperty(
    "--font-ui-tracking",
    tracking === 0 ? "normal" : `${tracking}em`,
  );
  root.dataset.uiWeight = String(uiWeight);
  root.dataset.codeWeight = String(codeWeight);
  root.dataset.uiSize = String(uiSize);
  root.dataset.codeSize = String(codeSize);
}
