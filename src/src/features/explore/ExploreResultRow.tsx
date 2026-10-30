import {
  BookBookmarkIcon,
  GitForkIcon,
  LockSimpleIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import type { ForgeSearchRepo } from "@/lib/git/types";
import { repoStateLabel } from "@/lib/repo-labels";
import { cn } from "@/lib/utils";
import { exploreOptionId, repoWebUrl, starParts } from "./explore-utils";

/** Two clicks on the same row inside this window count as a double-click. */
const DOUBLE_CLICK_MS = 400;
/** Suppresses a second open when the platform ALSO delivers a native `dblclick`
 *  for the same gesture (macOS does), so one gesture never opens two tabs. */
const REOPEN_GUARD_MS = 600;

/** One repository result row — a `role="option"` in the results listbox. Row
 *  anatomy mirrors the clone browser's RepoRow (leading icon by private/fork
 *  priority) plus stars and a truncated description for the richer search shape.
 *
 *  A single click selects the row (the detail pane follows it); a double click
 *  opens the repository page in the default browser. The two gestures don't
 *  fight: a double click still lands one selection first, which is the state the
 *  user expects to keep when they come back to the window.
 *
 *  The double-click is detected from the click timestamps rather than left to
 *  the platform's `dblclick` alone. Both paths are wired — a native `dblclick`
 *  (what a real mouse produces in WKWebView) and the timestamp pair (what every
 *  other input path produces, including synthetic clicks from automation and
 *  assistive tools). The guard keeps the overlap from opening twice. */
export function ExploreResultRow({
  repo,
  active,
  onSelect,
}: {
  repo: ForgeSearchRepo;
  active: boolean;
  onSelect: (repo: ForgeSearchRepo) => void;
}) {
  const Icon = repo.private
    ? LockSimpleIcon
    : repo.fork
      ? GitForkIcon
      : BookBookmarkIcon;
  const stateLabel = repoStateLabel(repo.private, repo.fork);
  const star = starParts(repo.stars ?? null);
  const webUrl = repoWebUrl(repo);

  const lastClickAt = useRef(0);
  const lastOpenAt = useRef(0);

  const openInBrowser = useCallback(() => {
    if (!webUrl) return;
    const now = Date.now();
    if (now - lastOpenAt.current < REOPEN_GUARD_MS) return;
    lastOpenAt.current = now;
    void openUrl(webUrl).catch(() => undefined);
  }, [webUrl]);

  function handleClick() {
    onSelect(repo);
    const now = Date.now();
    if (now - lastClickAt.current < DOUBLE_CLICK_MS) {
      lastClickAt.current = 0;
      openInBrowser();
      return;
    }
    lastClickAt.current = now;
  }

  return (
    <button
      type="button"
      id={exploreOptionId(repo.fullName)}
      role="option"
      aria-selected={active}
      // Selection rides aria-activedescendant on the search input, which keeps
      // focus; a row in the tab order would be a second way to reach the list.
      tabIndex={-1}
      // tabIndex alone doesn't stop a click from focusing the row, which would
      // strand the input's arrow/Enter navigation; click activation still fires.
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleClick}
      onDoubleClick={openInBrowser}
      title={webUrl ? "Double-click to open in browser" : undefined}
      className={cn(
        "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs",
        active ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
      )}
    >
      <span className="flex items-center gap-2">
        {stateLabel ? (
          <span
            role="img"
            aria-label={stateLabel}
            title={stateLabel}
            className="flex shrink-0 items-center text-muted-foreground"
          >
            <Icon className="size-3.5" aria-hidden />
          </span>
        ) : (
          <Icon
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1 truncate">
          <span className="text-muted-foreground">{repo.owner}/</span>
          <span className="font-medium">{repo.name}</span>
        </span>
        {repo.archived && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            Archived
          </Badge>
        )}
        {star && (
          // role="img" prunes the icon AND the number, so the label carries both
          // the count and its unit.
          <span
            role="img"
            aria-label={star.label}
            title={star.label}
            className="flex shrink-0 items-center gap-0.5 tabular-nums text-muted-foreground"
          >
            <StarIcon className="size-3" aria-hidden />
            {star.text}
          </span>
        )}
      </span>
      {repo.description && (
        <span className="truncate pl-[1.375rem] text-[11px] text-muted-foreground">
          {repo.description}
        </span>
      )}
    </button>
  );
}
