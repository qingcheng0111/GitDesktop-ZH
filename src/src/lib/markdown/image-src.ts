/**
 * Resolve the relative image paths a README uses into URLs the webview can load.
 *
 * A README almost never writes absolute image URLs: it writes `![shot](docs/a.png)`
 * or `![](%E5%BE%AE%E4%BF%A1.png)` and lets the forge expand the path against the
 * repository. In the app, the Markdown body renders straight in the webview, so
 * those paths resolve against `tauri://localhost/` and every image is a broken
 * icon. This module rewrites them against the repo's raw content root.
 *
 * Only relative sources are touched; absolute URLs, data URIs, and the app's own
 * `asset:` / `tauri:` sources pass through byte-for-byte.
 */

import type { ForgeProvider } from "@/lib/git/types";

/** The raw-content root for a repo, trailing slash included. */
export function rawContentBase(
  provider: ForgeProvider,
  owner: string,
  name: string,
  branch: string | null | undefined,
): string {
  // `HEAD` resolves to the default branch on every forge's raw endpoint, so a
  // repo whose default branch is neither `main` nor `master` still resolves.
  const ref = encodeURIComponent(branch?.trim() || "HEAD");
  switch (provider) {
    case "gitlab":
      return `https://gitlab.com/${owner}/${name}/-/raw/${ref}/`;
    case "bitbucket":
      return `https://bitbucket.org/${owner}/${name}/raw/${ref}/`;
    default:
      return `https://raw.githubusercontent.com/${owner}/${name}/${ref}/`;
  }
}

/** Schemes and prefixes that must never be rewritten. */
const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** Collapse `.`/`..` segments so `./a/../b/c.png` becomes `b/c.png`. */
function normalizePath(path: string): string {
  const out: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

/** Percent-encode each segment, keeping the separators (and any existing %XX). */
function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
}

/** Rewrite one `src`, or return it unchanged when it isn't repo-relative. */
export function resolveImageSrc(src: string, base: string): string {
  const value = src.trim();
  if (!value) return src;
  // `#anchor`, `mailto:`, `data:`, `asset:`, `tauri:`, `https:` — not ours.
  if (value.startsWith("#") || ABSOLUTE.test(value)) return src;
  // A protocol-relative or already-absolute path is left alone below this line.
  const withoutRoot = value.replace(/^\.\//, "").replace(/^\/+/, "");
  const normalized = normalizePath(withoutRoot);
  if (!normalized) return src;
  return `${base}${encodePath(normalized)}`;
}

/**
 * Rewrite every relative `<img src>` in a sanitized HTML string. Also covers a
 * README that writes raw `<img>` tags rather than Markdown image syntax, since
 * both reach the DOM as the same element.
 */
export function rewriteRelativeImages(
  html: string,
  base: string | undefined,
): string {
  if (!base) return html;
  return html.replace(
    /(<img\b[^>]*?\bsrc=")([^"]*)(")/gi,
    (_match, head: string, src: string, tail: string) =>
      `${head}${resolveImageSrc(src, base)}${tail}`,
  );
}
