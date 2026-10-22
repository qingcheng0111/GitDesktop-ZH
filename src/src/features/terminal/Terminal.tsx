import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XTerm } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import {
  type PtyOpts,
  ptyClose,
  ptyOpen,
  ptyResize,
  ptyWrite,
} from "@/lib/pty";
import { errorMessage } from "@/lib/tauri/invoke";

/** Decode a base64 PTY chunk to bytes for `term.write` (xterm reassembles any
 *  partial UTF-8 across chunks itself). */
function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** The px size Settings → 代码字号 writes to `--font-code-size` ("14px"), or
 *  null before any setting has been applied. */
function codeFontSizeFromCss(): number | null {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-code-size")
    .trim();
  const px = Number.parseFloat(raw);
  return Number.isFinite(px) && px > 0 ? px : null;
}

/**
 * An xterm.js terminal wired to a Rust PTY: output streams in over a Channel,
 * keystrokes go back via `pty_write`, and the grid is kept in sync with the
 * element size (`pty_resize`). The parent keys this by session id (or a task
 * run id), so each instance is bound to one PTY for its whole life — hence the
 * one-shot setup effect. Unmounting kills the process.
 *
 * For a Tasks run (`kind: "task"`), pass the `interpreter` + `body` to run and an
 * `onExit` to surface the exit code in the run header. `onExit` is read through a
 * ref so a re-render can't stale-capture it in the mount-once effect.
 */
export function Terminal({
  ptyId,
  kind,
  cwd,
  ports,
  className,
  interpreter,
  body,
  path,
  args,
  onExit,
}: {
  ptyId: string;
  kind: PtyOpts["kind"];
  cwd: string;
  ports: string[];
  className?: string;
  interpreter?: string;
  body?: string;
  path?: string;
  args?: string[];
  onExit?: (code: number | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-once; props are fixed per instance (parent keys by session / task run)
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new XTerm({
      // Follows Settings → 代码字体 (the `--font-code` custom property), with the
      // previous stack as the fallback before any setting has been applied.
      fontFamily:
        getComputedStyle(document.documentElement)
          .getPropertyValue("--font-code")
          .trim() ||
        'ui-monospace, "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace',
      // Same story for the size: xterm renders from this option (a CSS font-size
      // on `.xterm` would desync its measured cell grid), so read the custom
      // property the Appearance panel writes and fall back to the old 12px.
      fontSize: codeFontSizeFromCss() ?? 12,
      cursorBlink: true,
      // A terminal stays dark regardless of app theme (conventional + readable).
      theme: {
        background: "#0b0b0c",
        foreground: "#e4e4e7",
        cursor: "#a1a1aa",
        selectionBackground: "#3f3f46",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    fit.fit();

    let exited = false;
    const onData = term.onData((d) => {
      if (!exited) ptyWrite(ptyId, d).catch(() => undefined);
    });

    ptyOpen(
      ptyId,
      {
        kind,
        cwd,
        ports,
        cols: term.cols,
        rows: term.rows,
        ...(kind === "task" ? { interpreter, body, path, args } : {}),
      },
      (e) => {
        if (e.type === "output") {
          term.write(decodeBase64(e.data));
        } else {
          exited = true;
          const code = e.code != null ? ` (code ${e.code})` : "";
          term.write(`\r\n\x1b[2m[process exited${code}]\x1b[0m\r\n`);
          onExitRef.current?.(e.code);
        }
      },
    ).catch((err) => {
      // `invoke` rejects with a plain AppError object, which stringifies to
      // "[object Object]" — the message has to be unwrapped to reach the grid.
      term.write(`\r\n\x1b[31m${errorMessage(err)}\x1b[0m\r\n`);
      // A spawn failure (bad interpreter, missing binary) is a terminal exit too.
      onExitRef.current?.(null);
    });

    // Refit + tell the PTY whenever the element resizes (dock drag, window, or
    // expanding from collapsed). Skip while collapsed to 0 — fit needs a size.
    const ro = new ResizeObserver(() => {
      if (host.clientHeight === 0 || host.clientWidth === 0) return;
      fit.fit();
      ptyResize(ptyId, term.cols, term.rows).catch(() => undefined);
    });
    ro.observe(host);
    term.focus();

    return () => {
      ro.disconnect();
      onData.dispose();
      ptyClose(ptyId).catch(() => undefined);
      term.dispose();
    };
  }, []);

  // `data-no-i18n`: terminal output is user data, never UI chrome.
  return <div ref={hostRef} className={className} data-no-i18n />;
}
