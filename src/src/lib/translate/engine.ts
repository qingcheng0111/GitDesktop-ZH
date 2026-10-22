/**
 * Translation engines for repository content.
 *
 * Three backends, tried in a deliberate order:
 *
 *  - `ai`       — the provider/model already configured under Settings → AI. Best
 *                 quality by far, and already inside the app's host allowlist.
 *  - `libre`    — public LibreTranslate instances, no key. This is the
 *                 out-of-the-box default: it answers in ~1 s, keeps inline tokens
 *                 intact, and has no per-IP daily cap like MyMemory.
 *  - `mymemory` — the MyMemory public API, no key, but a small daily quota and a
 *                 480-byte request ceiling. Last resort.
 *
 * `auto` = AI when configured, else `libre`, else `mymemory`. An engine that
 * fails on more than half its segments is abandoned for the next one, so a dead
 * instance degrades instead of blanking the page. Nothing here throws to the
 * caller: the worst case returns the English input unchanged.
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { createAiClient, MissingApiKeyError } from "@/lib/ai/client";
import type { AiSettings } from "@/lib/ai/types";
import { postEdit } from "./glossary";

/** Which backend a translation request may use. */
export type TranslationEngineId =
  | "auto"
  | "ai"
  | "google"
  | "bing"
  | "libre"
  | "mymemory";

/** Membership list for settings healing. */
export const TRANSLATION_ENGINE_IDS = [
  "auto",
  "ai",
  "google",
  "bing",
  "libre",
  "mymemory",
] as const;

export const TRANSLATION_ENGINES: { id: TranslationEngineId; label: string }[] =
  [
    { id: "auto", label: "自动（优先 AI → 浏览器同源翻译）" },
    { id: "ai", label: "AI 模型（设置 → AI 中的模型）" },
    { id: "google", label: "浏览器同源翻译（Chrome 内置接口，无需密钥）" },
    { id: "bing", label: "必应翻译（Edge 内置接口，无需密钥）" },
    { id: "libre", label: "开源接口 LibreTranslate（无需密钥，质量一般）" },
    { id: "mymemory", label: "MyMemory（无需密钥，额度很小）" },
  ];

/** LibreTranslate instances tried in order for the `libre` engine. */
const LIBRE_INSTANCES = [
  "https://translate.disroot.org/translate",
  "https://libretranslate.de/translate",
];

/** MyMemory rejects `q` above ~500 bytes; stay well under it. */
const MYMEMORY_MAX = 480;
/** Segments per AI round trip. Long enough to amortise the prompt, short enough
 *  that one bad line doesn't poison a whole page. */
const AI_BATCH = 24;
/** Per-request ceiling. A hung endpoint must not leave the UI on “翻译中…”. */
const REQUEST_TIMEOUT = 15_000;
/** Concurrent requests per engine. Above this the free endpoints start refusing. */
const CONCURRENCY = 3;

/** True when a segment carries enough Latin text to be worth translating. */
export function needsTranslation(text: string): boolean {
  const letters = text.match(/[A-Za-z]/g)?.length ?? 0;
  if (letters < 3) return false;
  // A segment that is already mostly Chinese is a mixed line (a Chinese README
  // with English code spans); translating it again would mangle it.
  const cjk = text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  return cjk * 2 < letters;
}

async function httpFetch(url: string, init?: RequestInit): Promise<Response> {
  // The Tauri fetch runs in Rust, so it is exempt from webview CORS — the free
  // translation endpoints send no CORS headers. In `vite dev` (a plain browser,
  // no Tauri runtime) fall back to window.fetch.
  try {
    return await tauriFetch(url, init);
  } catch (err) {
    if (typeof window !== "undefined" && "fetch" in window) {
      return window.fetch(url, init);
    }
    throw err;
  }
}

/** Fetch with a hard timeout, so no request can hang the whole document. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeout = REQUEST_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await httpFetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Run `worker` over `items` with a bounded number in flight, order preserved. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      for (;;) {
        const i = cursor++;
        if (i >= items.length) return;
        out[i] = await worker(items[i], i);
      }
    },
  );
  await Promise.all(runners);
  return out;
}

/** Split one long segment into engine-sized pieces on sentence boundaries. */
function chunk(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const slice = rest.slice(0, max);
    const cut =
      Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf("! "),
        slice.lastIndexOf("? "),
      ) + 1 ||
      Math.max(
        slice.lastIndexOf(", "),
        slice.lastIndexOf("; "),
        slice.lastIndexOf(": "),
      ) + 1 ||
      slice.lastIndexOf(" ");
    const at = cut > max * 0.4 ? cut : max;
    parts.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  if (rest) parts.push(rest);
  return parts;
}

/* ── Google (the endpoint Chrome's own translate uses) ─────────────────── */

/**
 * `client=dict-chrome-ex` is the endpoint Chrome's built-in translate talks to.
 * It needs no key, accepts MANY `q` parameters in one GET and answers with an
 * array in the same order — so a whole README is a handful of requests instead
 * of one per line. Output quality is the browser's, which is the bar this feature
 * is meant to hit.
 */
const GOOGLE_ENDPOINT = "https://translate.googleapis.com/translate_a/t";
/** Segments per request. */
const GOOGLE_BATCH_LINES = 40;
/** Characters per request; the endpoint accepts a few thousand. */
const GOOGLE_BATCH_CHARS = 3500;

async function googleBatch(texts: string[]): Promise<string[]> {
  const params = new URLSearchParams({
    client: "dict-chrome-ex",
    sl: "en",
    tl: "zh-CN",
  });
  for (const text of texts) params.append("q", text);
  const res = await fetchWithTimeout(
    `${GOOGLE_ENDPOINT}?${params.toString()}`,
    {
      method: "GET",
    },
  );
  if (!res.ok) throw new Error(`Google translate HTTP ${res.status}`);
  const raw = await res.text();
  const json = JSON.parse(raw) as unknown;
  // A single `q` answers `["译文"]`; several answer the same shape. Some
  // responses nest an array of arrays — flatten one level either way.
  if (!Array.isArray(json)) throw new Error("Google translate shape changed");
  const flat = (json as unknown[]).map((v) =>
    Array.isArray(v) ? String(v[0] ?? "") : String(v ?? ""),
  );
  if (flat.length !== texts.length) {
    throw new Error(`Google translate returned ${flat.length}/${texts.length}`);
  }
  return flat;
}

async function googleAll(
  texts: string[],
  signal?: AbortSignal,
): Promise<{ texts: string[]; ok: boolean }> {
  const indexes = texts
    .map((text, index) => ({ text, index }))
    .filter(({ text }) => needsTranslation(text) && !signal?.aborted);
  if (indexes.length === 0) return { texts, ok: true };

  const batches: { text: string; index: number }[][] = [];
  let current: { text: string; index: number }[] = [];
  let size = 0;
  for (const item of indexes) {
    const len = item.text.length;
    if (
      current.length &&
      (size + len > GOOGLE_BATCH_CHARS || current.length >= GOOGLE_BATCH_LINES)
    ) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += len;
  }
  if (current.length) batches.push(current);

  const out = [...texts];
  let done = 0;
  await mapLimit(batches, 2, async (batch) => {
    const attempt = async (): Promise<boolean> => {
      const translated = await googleBatch(batch.map((b) => b.text));
      batch.forEach((item, i) => {
        out[item.index] = postEdit(translated[i]) || item.text;
      });
      done += batch.length;
      return true;
    };
    try {
      await attempt();
    } catch {
      // A single retry covers the endpoint's occasional truncated array.
      try {
        await attempt();
      } catch {
        // Batch stays English; the caller decides whether to fall through.
      }
    }
  });

  return { texts: out, ok: done * 2 >= indexes.length };
}

/* ── Bing (the engine behind Edge's built-in translate) ────────────────── */

/**
 * Bing's translator is a two-step HTTP flow with no API key: load
 * `/translator` to get a short-lived `IG`/`IID` pair plus an abuse-prevention
 * `key`/`token`, then POST `/ttranslatev3`. That is the same backend Edge's
 * "translate this page" uses, so quality is the browser-grade output the feature
 * is meant to match — no dictionary drift, code spans preserved.
 *
 * The session is cached for ten minutes because a README is 30–80 requests and
 * re-scraping the page for each one would trip Bing's rate limiter.
 */
interface BingSession {
  ig: string;
  iid: string;
  key: string;
  token: string;
  at: number;
}

const BING_ORIGIN = "https://cn.bing.com";
const BING_SESSION_TTL = 10 * 60 * 1000;
/** Chars per request. Bing accepts ~1000; leave room for the wrapper fields. */
const BING_BATCH_CHARS = 900;
/** Segments per request — keeps "\n" line-splitting reliable. */
const BING_BATCH_LINES = 16;

let bingSession: BingSession | null = null;

async function loadBingSession(): Promise<BingSession> {
  const res = await fetchWithTimeout(
    `${BING_ORIGIN}/translator?from=en&to=zh-Hans`,
    {
      method: "GET",
    },
  );
  if (!res.ok) throw new Error(`Bing page HTTP ${res.status}`);
  const html = await res.text();
  const ig = html.match(/IG:"([0-9A-Fa-f]+)"/)?.[1];
  const iid = html.match(/data-iid="([^"]+)"/)?.[1];
  const abuse = html.match(
    /params_AbusePreventionHelper\s*=\s*(\[[^\]]*\])/,
  )?.[1];
  if (!ig || !iid || !abuse) throw new Error("Bing page shape changed");
  const [key, token] = JSON.parse(abuse.replace(/\\/g, "")) as [number, string];
  return { ig, iid, key: String(key), token, at: Date.now() };
}

async function getBingSession(): Promise<BingSession> {
  if (bingSession && Date.now() - bingSession.at < BING_SESSION_TTL)
    return bingSession;
  bingSession = await loadBingSession();
  return bingSession;
}

async function bingRequest(text: string): Promise<string> {
  const session = await getBingSession();
  const url = `${BING_ORIGIN}/ttranslatev3?isVertical=1&IG=${session.ig}&IID=${session.iid}`;
  const body = new URLSearchParams({
    fromLang: "en",
    to: "zh-Hans",
    key: session.key,
    token: session.token,
    text,
  });
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${BING_ORIGIN}/translator`,
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Bing translate HTTP ${res.status}`);
  const json = (await res.json()) as
    | { translations?: { text?: string }[] }[]
    | { statusCode?: number; errorMessage?: string };
  if (!Array.isArray(json)) {
    throw new Error(
      `Bing translate refused: ${json.errorMessage || json.statusCode}`,
    );
  }
  const out = json[0]?.translations?.[0]?.text ?? "";
  if (!out) throw new Error("Bing translate returned nothing");
  return out;
}

/**
 * Translate a whole document through Bing. Segments are packed into requests
 * separated by newlines — Bing preserves the line structure, and one request per
 * 900 characters keeps a 60-segment README at a handful of round trips instead
 * of sixty (which is what trips the rate limiter).
 */
async function bingAll(
  texts: string[],
  signal?: AbortSignal,
): Promise<{ texts: string[]; ok: boolean }> {
  const indexes = texts
    .map((text, index) => ({ text, index }))
    .filter(({ text }) => needsTranslation(text) && !signal?.aborted);
  if (indexes.length === 0) return { texts, ok: true };

  const out = [...texts];
  const batches: { text: string; index: number }[][] = [];
  let current: { text: string; index: number }[] = [];
  let size = 0;
  for (const item of indexes) {
    const len = item.text.length + 1;
    if (
      current.length &&
      (size + len > BING_BATCH_CHARS || current.length >= BING_BATCH_LINES)
    ) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += len;
  }
  if (current.length) batches.push(current);

  let done = 0;
  await mapLimit(batches, 2, async (batch) => {
    const joined = batch.map((b) => b.text).join("\n");
    try {
      const translated = await bingRequest(joined);
      const lines = translated.split("\n");
      if (lines.length === batch.length) {
        batch.forEach((item, i) => {
          out[item.index] = postEdit(lines[i].trim()) || item.text;
        });
        done += batch.length;
        return;
      }
      // Line count drifted (Bing merged a wrapped line): fall back to one
      // request per segment rather than map translations onto the wrong lines.
      for (const item of batch) {
        try {
          out[item.index] = postEdit(await bingRequest(item.text)) || item.text;
          done += 1;
        } catch {
          out[item.index] = item.text;
        }
      }
    } catch {
      // A failed batch keeps its English text; another batch may still succeed.
    }
  });

  return { texts: out, ok: done * 2 >= indexes.length };
}

/* ── MyMemory ─────────────────────────────────────────────────────────── */

async function myMemoryOne(text: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text,
  )}&langpair=en|zh-CN`;
  const res = await fetchWithTimeout(url, { method: "GET" });
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const json = (await res.json()) as {
    responseStatus?: number | string;
    responseDetails?: string;
    responseData?: { translatedText?: string };
  };
  const out = json.responseData?.translatedText ?? "";
  // MyMemory reports quota exhaustion in-band with HTTP 200.
  if (
    /MYMEMORY WARNING|QUOTA/i.test(out) ||
    /quota/i.test(json.responseDetails ?? "")
  ) {
    throw new Error("MyMemory 今日额度已用完，请改用其他引擎。");
  }
  if (!out) throw new Error(json.responseDetails || "翻译接口没有返回内容");
  return out;
}

async function myMemoryAll(
  texts: string[],
  signal?: AbortSignal,
): Promise<string[]> {
  return mapLimit(texts, 2, async (text) => {
    if (!needsTranslation(text) || signal?.aborted) return text;
    try {
      const pieces: string[] = [];
      for (const part of chunk(text, MYMEMORY_MAX)) {
        pieces.push(await myMemoryOne(part));
      }
      return postEdit(pieces.join(""));
    } catch {
      // One failed segment must not blank the page.
      return text;
    }
  });
}

/* ── LibreTranslate ───────────────────────────────────────────────────── */

async function libreOne(instance: string, text: string): Promise<string> {
  const res = await fetchWithTimeout(instance, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: "en",
      target: "zh",
      format: "text",
    }),
  });
  if (!res.ok) throw new Error(`${instance} HTTP ${res.status}`);
  const json = (await res.json()) as {
    translatedText?: string;
    error?: string;
  };
  if (json.error) throw new Error(json.error);
  const out = (json.translatedText ?? "").trim();
  if (!out) throw new Error("空响应");
  return out;
}

/**
 * Try each instance on ONE probe string, then use the first that answered for the
 * whole document. Probing once is what keeps a dead instance from costing a
 * timeout per segment.
 */
async function pickLibreInstance(sample: string): Promise<string | null> {
  for (const instance of LIBRE_INSTANCES) {
    try {
      const out = await libreOne(instance, sample);
      if (/[\u4e00-\u9fff]/.test(out)) return instance;
    } catch {
      // Next instance.
    }
  }
  return null;
}

async function libreAll(
  texts: string[],
  signal?: AbortSignal,
): Promise<{ texts: string[]; ok: boolean }> {
  const probe = texts.find((t) => needsTranslation(t)) ?? texts[0] ?? "";
  const instance = probe ? await pickLibreInstance(probe) : null;
  if (!instance) return { texts, ok: false };

  let done = 0;
  const out = await mapLimit(texts, CONCURRENCY, async (text) => {
    if (!needsTranslation(text) || signal?.aborted) return text;
    try {
      const translated: string[] = [];
      for (const part of chunk(text, 900))
        translated.push(await libreOne(instance, part));
      done += 1;
      return postEdit(translated.join(""));
    } catch {
      return text;
    }
  });
  // Fewer than half the segments translated = the instance is rate-limiting or
  // half-dead; let the caller fall through to the next engine.
  const wanted = texts.filter((t) => needsTranslation(t)).length;
  return { texts: out, ok: done * 2 >= wanted };
}

/* ── AI model ─────────────────────────────────────────────────────────── */

const AI_SYSTEM = [
  "You are a professional technical translator. Translate English GitHub",
  "documentation into natural Simplified Chinese.",
  "Rules: keep Markdown syntax, code spans, placeholders like [[0]], URLs and",
  "product names (npm, CLI, Tauri, GitHub) unchanged. Do not add commentary.",
  "Answer with a JSON array of strings only, same length and order as the input.",
].join(" ");

/** Recover the JSON array from a model answer that may be fenced or padded. */
function parseJsonArray(raw: string): string[] | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : raw).trim();
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(body.slice(start, end + 1));
    if (!Array.isArray(value)) return null;
    return value.map((v) => (typeof v === "string" ? v : ""));
  } catch {
    return null;
  }
}

async function aiAll(
  texts: string[],
  ai: AiSettings,
  signal?: AbortSignal,
): Promise<string[]> {
  const client = await createAiClient(ai);
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += AI_BATCH) {
    const batch = texts.slice(i, i + AI_BATCH);
    const todo = batch.filter(needsTranslation);
    if (todo.length === 0) {
      out.push(...batch);
      continue;
    }
    let raw = "";
    for await (const delta of client.stream({
      system: AI_SYSTEM,
      prompt: JSON.stringify(todo),
      abortSignal: signal,
    })) {
      raw += delta;
    }
    const parsed = parseJsonArray(raw);
    if (!parsed || parsed.length !== todo.length) {
      // Provider answered in some other shape: keep English rather than
      // mis-aligning a translation onto the wrong paragraph.
      out.push(...batch);
      continue;
    }
    let cursor = 0;
    for (const segment of batch) {
      out.push(
        needsTranslation(segment)
          ? postEdit(parsed[cursor++] ?? segment)
          : segment,
      );
    }
  }
  return out;
}

/* ── Public API ───────────────────────────────────────────────────────── */

export interface TranslateOptions {
  engine: TranslationEngineId;
  /** The AI provider/model used by `ai`, and by `auto` as its first choice. */
  ai?: AiSettings;
  signal?: AbortSignal;
}

export interface TranslateResult {
  texts: string[];
  /** Which backend actually produced the output. */
  engine: "ai" | "google" | "bing" | "libre" | "mymemory" | "none";
}

/**
 * Translate `texts` into Simplified Chinese. Never throws for a backend failure —
 * it moves to the next engine and, at worst, returns the English input. The
 * result array always has the same length as `texts`.
 */
export async function translateSegments(
  texts: string[],
  opts: TranslateOptions,
): Promise<TranslateResult> {
  if (texts.length === 0 || !texts.some(needsTranslation)) {
    return { texts, engine: "none" };
  }

  if (opts.engine === "ai" || opts.engine === "auto") {
    if (opts.ai) {
      try {
        return {
          texts: await aiAll(texts, opts.ai, opts.signal),
          engine: "ai",
        };
      } catch (err) {
        // A missing key is the normal state on a fresh install; a provider or
        // network failure deserves the free path too. Logged for diagnosis, not
        // surfaced: the free engines below are the user-visible fallback.
        if (!(err instanceof MissingApiKeyError)) {
          console.warn("[translate] AI engine unavailable:", err);
        }
      }
    }
  }

  if (opts.engine === "auto" || opts.engine === "google") {
    const google = await googleAll(texts, opts.signal);
    if (google.ok) return { texts: google.texts, engine: "google" };
  }

  if (opts.engine === "auto" || opts.engine === "bing") {
    const bing = await bingAll(texts, opts.signal);
    if (bing.ok) return { texts: bing.texts, engine: "bing" };
  }

  if (opts.engine !== "mymemory") {
    const libre = await libreAll(texts, opts.signal);
    if (libre.ok) return { texts: libre.texts, engine: "libre" };
  }

  return { texts: await myMemoryAll(texts, opts.signal), engine: "mymemory" };
}
