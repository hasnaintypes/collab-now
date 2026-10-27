"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { PanelLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeadingEntry } from "./plugins/heading-outline-plugin";

type SidebarContentProps = {
  headings: HeadingEntry[];
  activeHeadingKey: string | null;
  onScrollToHeading: (key: string) => void;
  onClose: () => void;
};

/**
 * Header ("Document outline" + divider) stays put while the list scrolls
 * underneath it — matching Google Docs' outline panel, where scrolled-past
 * items disappear behind the heading/divider rather than scrolling up over
 * it. Achieved by keeping the header out of the `overflow-y-auto` region
 * rather than inside it.
 */
export function DocumentSidebarContent({
  headings,
  activeHeadingKey,
  onScrollToHeading,
  onClose,
}: SidebarContentProps) {
  const navRef = useRef<HTMLElement>(null);
  const [truncated, setTruncated] = useState<Map<string, string>>(new Map());

  /**
   * Manual truncation, not CSS `text-overflow: ellipsis` — verified live
   * (DOM: `scrollWidth > clientWidth`, `text-overflow: ellipsis`,
   * `white-space: nowrap` all correctly applied) that this browser simply
   * never paints the automatic "…" here, it just hard-clips. A plain "…"
   * character typed into the DOM *does* render fine, so instead of relying
   * on the browser's automatic ellipsis we measure against a hidden clone
   * styled from each button's own live `getComputedStyle` (not a guessed
   * font stack — that was tried before and drifted out of sync with the
   * real font, which is how the "…" itself ended up clipped) and binary-
   * search the longest substring + "…" that actually fits.
   */
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const measurer = document.createElement("span");
    measurer.style.cssText =
      "position:absolute; visibility:hidden; white-space:nowrap; left:-9999px; top:-9999px;";
    document.body.appendChild(measurer);

    const next = new Map<string, string>();
    nav
      .querySelectorAll<HTMLButtonElement>("button[data-heading-key]")
      .forEach((btn) => {
        const key = btn.dataset.headingKey!;
        const fullText = btn.dataset.headingText!;
        const cs = getComputedStyle(btn);
        measurer.style.fontSize = cs.fontSize;
        measurer.style.fontWeight = cs.fontWeight;
        measurer.style.fontFamily = cs.fontFamily;
        measurer.style.letterSpacing = cs.letterSpacing;

        // -2px safety buffer: `scrollWidth`/`clientWidth` are both rounded
        // to whole pixels, so a "fits exactly" result can still have the
        // trailing "…" sitting flush against the clip boundary and get
        // chopped by sub-pixel layout rounding in the real (unrounded)
        // render.
        const maxWidth =
          btn.clientWidth -
          parseFloat(cs.paddingLeft) -
          parseFloat(cs.paddingRight) -
          2;

        measurer.textContent = fullText;
        if (measurer.scrollWidth <= maxWidth) {
          next.set(key, fullText);
          return;
        }

        let low = 0;
        let high = fullText.length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          measurer.textContent = `${fullText.slice(0, mid).trimEnd()}…`;
          if (measurer.scrollWidth <= maxWidth) {
            low = mid;
          } else {
            high = mid - 1;
          }
        }
        next.set(key, `${fullText.slice(0, low).trimEnd()}…`);
      });

    document.body.removeChild(measurer);
    // Unlike the setState-in-effect cases restructured in
    // use-document-search.ts, this value genuinely can't be computed
    // during render — it depends on each button's actual mounted layout
    // (clientWidth, computed font metrics), which only exists once the
    // DOM has painted. That's exactly what `useLayoutEffect` is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTruncated(next);
  }, [headings]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0a0a0a]">
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-white/15 shrink-0">
        <h3 className="text-sm font-bold text-white">Document outline</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X className="size-4 text-white/70" />
        </button>
      </div>

      {headings.length === 0 ? (
        <p className="px-6 py-6 text-xs text-white/60 text-center leading-relaxed">
          Add headings to your document to see an outline here.
        </p>
      ) : (
        <nav
          ref={navRef}
          className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-1.5"
        >
          {headings.map((h) => (
            <button
              key={h.key}
              data-heading-key={h.key}
              data-heading-text={h.text}
              onClick={() => onScrollToHeading(h.key)}
              title={h.text}
              className={cn(
                "w-full min-w-0 shrink-0 block overflow-hidden whitespace-nowrap text-left py-2 border-l-2 text-sm leading-snug font-semibold transition-colors rounded-r",
                h.tag === "h1" && "pl-3 pr-3 mt-2 first:mt-0",
                h.tag === "h2" && "pl-6 pr-3 font-medium",
                (h.tag === "h3" ||
                  h.tag === "h4" ||
                  h.tag === "h5" ||
                  h.tag === "h6") &&
                  "pl-9 pr-3 text-[13px] font-medium",
                activeHeadingKey === h.key
                  ? "border-white bg-white/10 text-white"
                  : "border-transparent text-white hover:bg-white/5"
              )}
            >
              {truncated.get(h.key) ?? h.text}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

/**
 * Desktop outline panel. When `visible` is false it renders nothing but a
 * small floating round toggle (Google Docs-style) — not a collapsed rail —
 * so closing it actually gives the editor the full width back instead of
 * just swapping the panel's content for a thin "Show outline" link.
 */
export default function DocumentSidebar({
  visible,
  onOpen,
  ...contentProps
}: SidebarContentProps & { visible: boolean; onOpen: () => void }) {
  if (!visible) {
    return (
      <button
        onClick={onOpen}
        aria-label="Show document outline"
        className="fixed left-4 top-32 z-10 hidden lg:flex items-center justify-center size-9 rounded-full bg-muted hover:bg-muted/80 transition-colors"
      >
        <PanelLeft className="size-4 text-foreground" />
      </button>
    );
  }

  return (
    <aside className="fixed left-0 top-28 h-[calc(100vh-112px)] w-72 bg-[#0a0a0a] hidden lg:flex flex-col">
      <DocumentSidebarContent {...contentProps} />
    </aside>
  );
}
