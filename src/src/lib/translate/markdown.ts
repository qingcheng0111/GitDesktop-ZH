/**
 * Markdown-aware segmentation for content translation.
 *
 * Translating a whole README with a sentence-level MT API corrupts it: fences
 * get "translated", link targets break, tables lose their pipes. This module
 * walks the source line by line and hands out only prose, leaving structure in
 * place, then reassembles the document around the translated lines.
 *
 * Inline constructs inside a prose line (code spans, URLs, image targets, HTML
 * tags) are masked to `[[n]]` tokens before the call and restored after it, so a
 * translator can reorder words freely without breaking a link. A line whose
 * tokens do not all survive the round trip is kept in English — the failure is
 * per line, never per document.
 */

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(\s*#{1,6}\s+)(.*)$/;
const LIST_ITEM = /^(\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)(.*)$/;
const TABLE_DIVIDER = /^\s*\|?[\s:|-]+\|[\s:|-]*$/;
const IMAGE_ONLY = /^\s*(?:\[?!\[[^\]]*\]\([^)]*\)\]?(?:\([^)]*\))?\s*)+$/;
const HTML_ONLY = /^\s*<\/?[a-zA-Z][^>]*>\s*$/;
const BADGE_LINE = /^\s*\[!\[/;
/** A setext underline (`===` / `---`) or a thematic break: structure, not prose.
 *  Left as literal so it never merges into the paragraph above it (that produced
 *  headings reading "ripgrep (rg) ------------" on the translated page). */
const RULE_LINE = /^\s*(?:[-=_*]\s*){3,}$/;

export interface MarkdownSegment {
  /** The prose to translate. */
  text: string;
  /** Marks the segment a caller must not translate (kept for alignment). */
  keep: boolean;
}

interface LineSlot {
  /** Everything before the prosaic part: heading hashes, list markers, indent. */
  prefix: string;
  /** The prosaic part of the line. */
  text: string;
  /** Quote/marker for a line we never translate (fence, table rule, blank…). */
  literal?: string;
}

/**
 * Split a Markdown document into one slot per line. `translatable` is the list
 * of slot indices whose text may be replaced; everything else is literal.
 */
export function splitMarkdown(md: string): {
  slots: LineSlot[];
  translatable: { index: number; text: string }[];
} {
  const lines = md.split("\n");
  const slots: LineSlot[] = [];
  const translatable: { index: number; text: string }[] = [];
  let inFence = false;

  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      slots.push({ prefix: "", text: "", literal: line });
      continue;
    }
    if (inFence) {
      slots.push({ prefix: "", text: "", literal: line });
      continue;
    }
    if (!line.trim()) {
      slots.push({ prefix: "", text: "", literal: line });
      continue;
    }
    if (
      TABLE_DIVIDER.test(line) ||
      IMAGE_ONLY.test(line) ||
      HTML_ONLY.test(line) ||
      BADGE_LINE.test(line) ||
      RULE_LINE.test(line)
    ) {
      slots.push({ prefix: "", text: "", literal: line });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      slots.push({ prefix: heading[1], text: heading[2] });
      translatable.push({ index: slots.length - 1, text: heading[2] });
      continue;
    }
    const list = LIST_ITEM.exec(line);
    if (list) {
      slots.push({ prefix: list[1], text: list[2] });
      translatable.push({ index: slots.length - 1, text: list[2] });
      continue;
    }
    // A plain prose line. READMEs hard-wrap paragraphs at ~80 columns, so a
    // sentence can span several source lines; translating each line alone is
    // what produces the "可以递归搜索当前 / 正则表达式模式的目录" word-order
    // breakage. Merge the run into the first slot and blank the rest, so the
    // paragraph reaches the translator as one sentence.
    const previous = slots[slots.length - 1];
    const previousIsProse =
      previous &&
      previous.literal === undefined &&
      previous.prefix === "" &&
      translatable[translatable.length - 1]?.index === slots.length - 1;
    if (previousIsProse) {
      // Extend the run in place. No filler slot is pushed: the paragraph becomes
      // ONE output line, which is what Markdown wants anyway (a hard-wrapped
      // README reflows to the window).
      previous.text = `${previous.text} ${line.trim()}`;
      translatable[translatable.length - 1] = {
        index: slots.length - 1,
        text: previous.text,
      };
      continue;
    }
    slots.push({ prefix: "", text: line });
    translatable.push({ index: slots.length - 1, text: line });
  }

  return { slots, translatable };
}

/** Join slots back into a document, substituting `replacements` by slot index. */
export function joinMarkdown(
  slots: LineSlot[],
  replacements: Map<number, string>,
): string {
  return slots
    .map((slot, i) => {
      if (slot.literal !== undefined) return slot.literal;
      const next = replacements.get(i);
      return next === undefined
        ? `${slot.prefix}${slot.text}`
        : `${slot.prefix}${next}`;
    })
    .join("\n");
}

export interface MaskedLine {
  /** The line with every structural span replaced by a `[[n]]` token. */
  masked: string;
  /** Prose hidden inside a span (a link label, emphasised text), in the order the
   *  tokens were minted. Each one is translated as its own segment and handed back
   *  to {@link MaskedLine.restore}; entries that need no translation are `""`. */
  inner: string[];
  /** Rebuild the line: `translated` is the masked line's translation, `inner`
   *  the matching label translations. Returns null when a token was lost. */
  restore: (translated: string, inner: string[]) => string | null;
}

const TOKEN = /\[\[(\d+)\]\]/g;

/** Where a token's text goes back. `prefix`/`suffix` wrap the (translated) label. */
interface Span {
  prefix: string;
  suffix: string;
  /** Untouched text, placed as-is (images, code, URLs, HTML, table pipes). */
  literal?: string;
  /** Label to translate; `""` means nothing to do. */
  label: string;
  /** Index into {@link MaskedLine.inner} for this span's label. */
  innerIndex: number;
}

/**
 * Hide the structural parts of a line behind `[[n]]` tokens and leave only prose
 * translatable.
 *
 * Each span is ONE token, never a pair. Chrome's translate endpoint reorders
 * tokens when it restructures a sentence; two-token links (`[[0]]` for `[` and
 * `[[1]]` for `](url)`) come back as `ripgrep[[1]] 的 [[0]] 博客文章` and render as
 * a broken link. With the span atomic, the whole link moves as a unit and its
 * label rides along in `inner`, translated as a separate segment.
 *
 * Why `[[n]]` and not a fancy bracket: the endpoint returns an EMPTY string when
 * a line starts with a CJK-punctuation token like `⟦0⟧`, and rewrites
 * `[guide](url)` as `【指南】(url)`. ASCII double brackets survive verbatim.
 */
export function maskInline(line: string): MaskedLine {
  const spans: Span[] = [];
  const inner: string[] = [];

  const literal = (text: string) => {
    spans.push({ prefix: "", suffix: "", literal: text, label: "", innerIndex: -1 });
    return `[[${spans.length - 1}]]`;
  };
  const labelled = (label: string, prefix: string, suffix: string) => {
    // A label that already holds a token is a nested construct (`**[link](u)**`):
    // translating the token text would be nonsense, so keep the whole span as a
    // literal instead.
    const needsWork = /[A-Za-z]{3}/.test(label) && !label.includes("[[");
    const innerIndex = needsWork ? inner.push(label) - 1 : -1;
    spans.push({ prefix, suffix, label, innerIndex });
    return `[[${spans.length - 1}]]`;
  };

  const masked = line
    // Images first: alt text is usually a badge label, and the whole construct
    // must stay byte-identical.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, (m) => literal(m))
    // Inline code: never translated, never reflowed.
    .replace(/`[^`\n]*`/g, (m) => literal(m))
    // Links: the whole `[label](target)` is one token; the label is translated
    // separately and spliced back between the brackets.
    .replace(
      /\[([^[\]]*)\]\(([^()\s]*(?:\([^)]*\))?[^()\s]*)\)/g,
      (_m, label: string, target: string) => labelled(label, "[", `](${target})`),
    )
    // Autolinks and bare URLs.
    .replace(/https?:\/\/[^\s)>\]]+/g, (m) => literal(m))
    // Raw HTML tags.
    .replace(/<\/?[a-zA-Z][^>]*>/g, (m) => literal(m))
    // Emphasis: same pairing hazard, so `**bold**` is one token with its text in
    // `inner` (a translator that saw `**` on its own would swap it for 「」).
    .replace(/\*\*([^*\n]+)\*\*/g, (_m, text: string) => labelled(text, "**", "**"))
    .replace(/__([^_\n]+)__/g, (_m, text: string) => labelled(text, "__", "__"))
    // Table pipes: structural, never translatable.
    .replace(/\|/g, (m) => literal(m));

  const restore = (translated: string, innerTexts: string[]): string | null => {
    let ok = true;
    const out = translated.replace(TOKEN, (_m, idx: string) => {
      const span = spans[Number(idx)];
      if (!span) {
        ok = false;
        return _m;
      }
      if (span.literal !== undefined) return span.literal;
      const label =
        span.innerIndex >= 0
          ? (innerTexts[span.innerIndex] || span.label).trim()
          : span.label;
      return `${span.prefix}${label}${span.suffix}`;
    });
    if (!ok) return null;
    // A translator that silently drops a token would leave a broken link.
    for (let i = 0; i < spans.length; i += 1) {
      if (!translated.includes(`[[${i}]]`)) return null;
    }
    // The endpoint pads restored spans with spaces ("每个 [ 版本 ](url) 都…");
    // collapse the ones that end up inside CJK punctuation.
    return out.replace(/\s+([。，、；：！？）】」』])/g, "$1");
  };

  return { masked, inner, restore };
}

/** True when the document has anything worth a translation round trip. */
export function hasTranslatableProse(md: string): boolean {
  const { translatable } = splitMarkdown(md);
  return translatable.some(({ text }) => /[A-Za-z]{3}/.test(text));
}
