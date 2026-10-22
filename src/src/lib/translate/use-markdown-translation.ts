/**
 * React binding for content translation (see `./store`).
 *
 * The Markdown component renders synchronously, so this hook returns whatever is
 * available *now* and re-renders when the cache fills in. It also owns the
 * per-document “show original / show translation” switch, which is what makes
 * the three modes behave differently:
 *
 *   auto   — request on mount, render Chinese when it lands, one click back to English
 *   manual — render English until the reader presses 翻译
 *   off    — always English, no requests
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useSettings } from "@/lib/settings/queries";
import { hasTranslatableProse } from "./markdown";
import type { ContentTranslationMode } from "./mode";
import {
  isSuppressed,
  requestTranslation,
  setSuppressed,
  subscribeTranslations,
  translatedSource,
  translationVersion,
} from "./store";

export interface MarkdownTranslation {
  /** The Markdown source to render — translated or original. */
  source: string;
  mode: ContentTranslationMode;
  /** True while `source` is a translation rather than the original. */
  translated: boolean;
  /** A request for this document is in flight. */
  busy: boolean;
  /** The last request finished without producing a translation. */
  failed: boolean;
  /** Nothing to translate (already Chinese, or code only). */
  noop: boolean;
  /** Translate now (manual mode) or re-translate (any mode). */
  translate: () => void;
  showOriginal: () => void;
  showTranslated: () => void;
}

export function useMarkdownTranslation(text: string): MarkdownTranslation {
  const settings = useSettings();
  const mode: ContentTranslationMode =
    settings.data?.contentTranslation ?? "auto";
  const engine = settings.data?.translationEngine ?? "auto";
  const ai = settings.data?.ai;

  const version = useSyncExternalStore(
    subscribeTranslations,
    translationVersion,
    translationVersion,
  );

  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // The translation this instance itself got back. Kept in local state because
  // the store's change signal is not reliable enough to depend on for the very
  // component that asked: a request that resolves after the surface has already
  // taken its snapshot leaves the view on the English text even though the cache
  // holds the translation. Resolving into state makes the update unconditional.
  const [resolved, setResolved] = useState<string | null>(() =>
    translatedSource(text, engine),
  );

  useEffect(() => {
    setResolved(translatedSource(text, engine));
    setRequested(false);
    setFailed(false);
  }, [text, engine]);

  // `version` is a real dependency: the cache is a module-level Map, so nothing
  // else would tell this render that another surface translated the same body.
  // biome-ignore lint/correctness/useExhaustiveDependencies: version invalidates the cache read
  const cached = useMemo(
    () => resolved ?? translatedSource(text, engine),
    [resolved, text, engine, version],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: version invalidates the flag read
  const suppressed = useMemo(
    () => isSuppressed(text, engine),
    [text, engine, version],
  );

  const noop = useMemo(() => !hasTranslatableProse(text), [text]);
  const showTranslation =
    mode === "auto" ? !!cached && !suppressed : requested && !!cached;

  useEffect(() => {
    if (mode !== "auto" || noop || cached || suppressed) return;
    let alive = true;
    setBusy(true);
    void requestTranslation(text, { engine, ai })
      .then((zh) => {
        if (!alive) return;
        setResolved(zh);
        setFailed(!zh);
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [mode, noop, cached, suppressed, text, engine, ai]);

  const translate = useCallback(() => {
    setRequested(true);
    if (cached) {
      setSuppressed(text, engine, false);
      return;
    }
    setBusy(true);
    setFailed(false);
    void requestTranslation(text, { engine, ai })
      .then((zh) => {
        setResolved(zh);
        setFailed(!zh);
      })
      .finally(() => setBusy(false));
  }, [cached, text, engine, ai]);

  const showOriginal = useCallback(() => {
    setRequested(false);
    setSuppressed(text, engine, true);
  }, [text, engine]);

  const showTranslated = useCallback(() => {
    setRequested(true);
    setSuppressed(text, engine, false);
  }, [text, engine]);

  return {
    source: showTranslation && cached ? cached : text,
    mode,
    translated: showTranslation,
    busy,
    failed,
    noop,
    translate,
    showOriginal,
    showTranslated,
  };
}
