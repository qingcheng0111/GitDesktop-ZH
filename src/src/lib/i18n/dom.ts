/**
 * DOM-level UI localization.
 *
 * The upstream UI hard-codes its English strings, so this fork translates at the
 * DOM layer: a MutationObserver rewrites text nodes (and a few label-ish
 * attributes) through the dictionary in `./ui-dict`, and restores the original
 * strings when the user switches back to English. Everything the observer
 * cannot find in the dictionary stays English — never machine-translated.
 *
 * Why this shape:
 *  - React re-renders replace text nodes; a WeakMap origin per node means a
 *    replacement node simply gets translated again on the next batch, and a
 *    switch back to English restores from the map instead of guessing.
 *  - Only text we actually changed is recorded, so a node React updates later
 *    (a live count, an error message) is re-evaluated rather than pinned to a
 *    stale translation.
 *  - Code, inputs, and anything marked `data-no-i18n` are skipped: diff
 *    contents, commit hashes, and file paths must render byte-for-byte.
 */

import { translateUiString } from "./ui-dict";

export type UiLanguage = "zh-CN" | "en";

/** Membership list for settings healing. */
export const UI_LANGUAGES = ["zh-CN", "en"] as const;

/** Attributes that carry user-visible chrome text. The original value is kept in
 *  `data-i18n-<attr>` so switching back to English is lossless. */
const LABEL_ATTRS = ["placeholder", "title", "aria-label"] as const;

/** Elements whose text must never be rewritten. */
const SKIP_TAGS = new Set([
  "CODE",
  "PRE",
  "SCRIPT",
  "STYLE",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "SVG",
  "CANVAS",
  "KBD",
  "SAMP",
  "VAR",
]);

const changedText = new WeakMap<Text, string>();
const changedAttrs = new WeakMap<Element, Map<string, string>>();

let observer: MutationObserver | null = null;
let language: UiLanguage = "en";
let scheduled = false;

/**
 * Anything matching this — the element itself or an ancestor — keeps its English
 * text. Covers explicit opt-outs plus the structural surfaces that render user
 * data (commit rows, file rows, list items, article bodies): a folder literally
 * named `Branch` must not become 分支. Chrome labels live in buttons, headings,
 * and spans outside those containers, so the dictionary still reaches them.
 */
const SKIP_SELECTOR =
  "[data-no-i18n], [role='row'], [role='gridcell'], [role='listitem'], [role='option'], [data-path]";

function skipped(node: Text | Element): boolean {
  const el =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  if (!el) return true;
  if (el.closest(SKIP_SELECTOR)) return true;
  for (let cur: Element | null = el; cur; cur = cur.parentElement) {
    if (SKIP_TAGS.has(cur.tagName)) return true;
    if ((cur as HTMLElement).isContentEditable) return true;
  }
  return false;
}

function localizeText(node: Text): void {
  const raw = node.nodeValue;
  if (!raw) return;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length < 2) return;
  const zh = translateUiString(trimmed);
  if (!zh) return;
  if (changedText.get(node) === zh) return;
  const lead = raw.slice(0, raw.indexOf(trimmed));
  const tail = raw.slice(lead.length + trimmed.length);
  changedText.set(node, zh);
  node.nodeValue = `${lead}${zh}${tail}`;
}

function localizeAttrs(el: Element): void {
  for (const attr of LABEL_ATTRS) {
    const value = el.getAttribute(attr);
    if (!value) continue;
    const zh = translateUiString(value.trim());
    if (!zh) continue;
    if (el.getAttribute(attr) === zh) continue;
    let seen = changedAttrs.get(el);
    if (!seen) {
      seen = new Map();
      changedAttrs.set(el, seen);
    }
    if (!seen.has(attr)) seen.set(attr, value);
    el.setAttribute(attr, zh);
  }
}

function walk(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    const t = root as Text;
    if (!skipped(t)) localizeText(t);
    return;
  }
  if (
    root.nodeType !== Node.ELEMENT_NODE &&
    root.nodeType !== Node.DOCUMENT_NODE
  )
    return;
  const el = root as Element;
  if (el.nodeType === Node.ELEMENT_NODE) {
    if (skipped(el)) return;
    localizeAttrs(el);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    if (!skipped(t)) localizeText(t);
  }
  if (el.nodeType === Node.ELEMENT_NODE) {
    for (const child of Array.from(el.querySelectorAll("*"))) {
      if (!skipped(child)) localizeAttrs(child);
    }
  }
}

function restore(): void {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    const original = changedText.get(t);
    if (original !== undefined) {
      // React may have replaced the text since we translated it; only restore a
      // node whose value is still the translation we wrote.
      const zh = translateUiString(original.trim());
      if (zh && t.nodeValue?.includes(zh))
        t.nodeValue = t.nodeValue.replace(zh, original);
      changedText.delete(t);
    }
  }
  for (const el of Array.from(document.querySelectorAll("*"))) {
    const seen = changedAttrs.get(el);
    if (!seen) continue;
    for (const [attr, original] of seen) el.setAttribute(attr, original);
    changedAttrs.delete(el);
  }
}

function flush(): void {
  scheduled = false;
  if (language !== "zh-CN" || !document.body) return;
  walk(document.body);
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(flush);
}

/**
 * Switch the UI language. `zh-CN` installs the observer and translates what is
 * already on screen; `en` disconnects it and puts every original string back.
 */
export function applyUiLanguage(next: UiLanguage): void {
  if (next === language && (next === "en" ? !observer : !!observer)) {
    // Already in the requested state — a settings refetch re-applies the same
    // value and must not re-walk a screen the user is reading.
    if (next === "zh-CN") schedule();
    return;
  }
  language = next;
  if (next === "zh-CN") {
    if (!observer) {
      observer = new MutationObserver((records) => {
        for (const r of records) {
          if (r.type === "childList") {
            for (const node of Array.from(r.addedNodes)) {
              if (node.isConnected) walk(node);
            }
          } else if (
            r.type === "characterData" &&
            r.target.nodeType === Node.TEXT_NODE
          ) {
            // React updates a label in place when a count or state changes
            // ("3 files" → "4 files"); re-localize that node. Our own writes
            // also land here, but `localizeText` re-matches the translated text
            // against the dictionary, finds nothing, and returns — no loop.
            const t = r.target as Text;
            if (!skipped(t)) localizeText(t);
          }
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    schedule();
  } else {
    observer?.disconnect();
    observer = null;
    restore();
  }
}

/** The language currently applied (boot code and tests read it). */
export function currentUiLanguage(): UiLanguage {
  return language;
}
