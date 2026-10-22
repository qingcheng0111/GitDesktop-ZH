/**
 * Translation cache + subscription for repository content.
 *
 * Rendering is synchronous and parsing happens in a `useMemo`, so the Markdown
 * component cannot await a translation. The contract is therefore:
 *
 *   read  — `translatedSource(source)` returns a cached translation or `null`
 *   write — `requestTranslation(source, opts)` fills the cache and bumps a
 *           version that subscribers re-render on
 *
 * That keeps the first paint in English-but-present rather than blank, and turns
 * Chinese on the moment the network answers. Cache entries survive restarts
 * (localStorage, LRU-capped) because reopening the same README repeatedly must
 * not burn the free engine's daily quota.
 */

import type { AiSettings } from "@/lib/ai/types";
import { type TranslationEngineId, translateSegments } from "./engine";
import {
  hasTranslatableProse,
  joinMarkdown,
  maskInline,
  splitMarkdown,
} from "./markdown";

const CACHE_KEY = "gd-translation-cache-v4";
/** Entries kept on disk; a README is one entry, so 120 covers a heavy week. */
const MAX_ENTRIES = 120;
/** Skip gigantic blobs (a generated changelog) rather than blow the 5 MB quota. */
const MAX_SOURCE = 120_000;

interface CacheEntry {
  zh: string;
  at: number;
  engine: string;
}

let cache: Map<string, CacheEntry> | null = null;
let version = 0;
const listeners = new Set<() => void>();
const inflight = new Map<string, Promise<string | null>>();
/** Sources the reader explicitly switched back to English (auto mode). */
const suppressed = new Set<string>();

/** djb2 over the source + engine: stable across restarts, no crypto needed. */
function hashSource(source: string, engine: string): string {
  let h = 5381;
  const input = `${engine}\u0000${source}`;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return `${(h >>> 0).toString(36)}-${source.length.toString(36)}`;
}

function load(): Map<string, CacheEntry> {
  if (cache) return cache;
  cache = new Map();
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v.zh === "string") cache.set(k, v);
      }
    }
  } catch {
    // A corrupt cache is not worth a dialog: start clean.
    cache = new Map();
  }
  return cache;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const entries = [...load().entries()];
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => b[1].at - a[1].at);
      cache = new Map(entries.slice(0, MAX_ENTRIES));
    }
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify(Object.fromEntries(load())),
      );
    } catch {
      // Quota exhausted: drop the oldest half and try once more.
      try {
        const sorted = [...load().entries()].sort((a, b) => b[1].at - a[1].at);
        cache = new Map(sorted.slice(0, Math.floor(MAX_ENTRIES / 2)));
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify(Object.fromEntries(load())),
        );
      } catch {
        // Give up quietly — translation still works for this session.
      }
    }
  }, 400);
}

function bump(): void {
  version += 1;
  for (const fn of listeners) fn();
}

export function subscribeTranslations(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function translationVersion(): number {
  return version;
}

/** A cached translation for `source`, or `null` when none exists yet. */
export function translatedSource(
  source: string,
  engine: string,
): string | null {
  if (!source || source.length > MAX_SOURCE) return null;
  return load().get(hashSource(source, engine))?.zh ?? null;
}

/** Whether the reader asked to see the English original of `source`. */
export function isSuppressed(source: string, engine: string): boolean {
  return suppressed.has(hashSource(source, engine));
}

export function setSuppressed(
  source: string,
  engine: string,
  value: boolean,
): void {
  const key = hashSource(source, engine);
  if (value) suppressed.add(key);
  else suppressed.delete(key);
  bump();
}

export interface TranslationRequest {
  engine: TranslationEngineId;
  ai?: AiSettings;
  /** Drop any cached/held translation first (the “重新翻译” path). */
  force?: boolean;
}

const MAX_CONCURRENT = 2;
let activeRequests = 0;
const waiters: (() => void)[] = [];

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests += 1;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  activeRequests += 1;
}

function releaseSlot(): void {
  activeRequests -= 1;
  waiters.shift()?.();
}

/**
 * Translate a Markdown document and cache it. Concurrent calls for the same
 * source share one request — a README rendered in two panes must not hit the
 * free API twice. Resolves to the Chinese text, or `null` when nothing could be
 * translated.
 */
export function requestTranslation(
  source: string,
  opts: TranslationRequest,
): Promise<string | null> {
  if (!source || source.length > MAX_SOURCE) return Promise.resolve(null);
  if (!hasTranslatableProse(source)) return Promise.resolve(null);
  const key = hashSource(source, opts.engine);
  if (!opts.force) {
    const hit = load().get(key);
    if (hit) return Promise.resolve(hit.zh);
  }
  const running = inflight.get(key);
  if (running) return running;

  const run = (async () => {
    await acquireSlot();
    try {
      const { slots, translatable } = splitMarkdown(source);
      const masks = translatable.map((t) => maskInline(t.text));
      // One batch carries both the masked lines and the labels hidden inside
      // their spans, so a README with 40 links does not double its request count.
      const innerCounts = masks.map((m) => m.inner.length);
      const { texts: translated } = await translateSegments(
        [...masks.map((m) => m.masked), ...masks.flatMap((m) => m.inner)],
        { engine: opts.engine, ai: opts.ai },
      );
      let cursor = masks.length;
      const replacements = new Map<number, string>();
      translatable.forEach((t, i) => {
        const count = innerCounts[i];
        const innerTexts = translated.slice(cursor, cursor + count);
        cursor += count;
        const restored = masks[i].restore(translated[i] ?? "", innerTexts);
        if (restored && restored !== t.text) replacements.set(t.index, restored);
      });
      if (replacements.size === 0) return null;
      const zh = joinMarkdown(slots, replacements);
      load().set(key, { zh, at: Date.now(), engine: opts.engine });
      suppressed.delete(key);
      persist();
      bump();
      return zh;
    } finally {
      releaseSlot();
    }
  })()
    .catch(() => null)
    .finally(() => inflight.delete(key));

  inflight.set(key, run);
  return run;
}

/** Cached documents, for the Settings panel's counter. */
export function translationCacheSize(): number {
  return load().size;
}

export function clearTranslationCache(): void {
  cache = new Map();
  suppressed.clear();
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Nothing to do: the in-memory cache is already gone.
  }
  bump();
}
