"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { cn } from "@/lib/utils";
import { useIsThreadActive } from "@liveblocks/react-lexical";
import { Composer, Thread } from "@liveblocks/react-ui";
import { useThreads } from "@liveblocks/react/suspense";
import type { ThreadData, BaseMetadata } from "@liveblocks/client";
import type { ComposerSubmitComment } from "@liveblocks/react-ui";
import { MessageSquare } from "lucide-react";
import { checkCommentRateLimit } from "../actions/comment.actions";

function ThreadWrapper({ thread }: { thread: ThreadData<BaseMetadata> }) {
  const isActive = useIsThreadActive(thread.id);

  return (
    <Thread
      thread={thread}
      data-state={isActive ? "active" : null}
      className={cn(
        "rounded-sm border border-border/50 transition-all duration-200",
        isActive && "!border-l-2 !border-l-primary shadow-sm",
        thread.resolved && "opacity-40"
      )}
    />
  );
}

/**
 * Split in two (rather than one `Comments` component) so the composer can
 * sit outside the scrollable region in `editor.tsx`'s panel — same
 * scroll-behind-the-header treatment as the document outline sidebar
 * (document-sidebar.tsx): the composer stays fixed at the top of the
 * panel, and only the thread list scrolls underneath it, instead of the
 * composer scrolling away with everything else.
 */
export function CommentComposer() {
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Soft, best-effort gate — see `checkCommentRateLimit`'s doc comment for why
  // this can't be a hard server-enforced limit given today's architecture
  // (comments post directly from the client to Liveblocks).
  const handleComposerSubmit = async (
    _comment: ComposerSubmitComment,
    event: FormEvent<HTMLFormElement>
  ) => {
    const result = await checkCommentRateLimit();
    if (!result.allowed) {
      event.preventDefault();
      setRateLimitError(
        result.error ?? "Please slow down before commenting again."
      );
      return;
    }
    setRateLimitError(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <Composer
        className="rounded-sm border border-border/50"
        onComposerSubmit={handleComposerSubmit}
      />
      {rateLimitError && (
        <p className="text-xs text-red-500">{rateLimitError}</p>
      )}
    </div>
  );
}

export function CommentThreadList() {
  const { threads } = useThreads();

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="mb-3 size-8 text-muted-foreground/40" />
        <p className="text-xs font-medium text-muted-foreground">
          No comments yet
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          Select text in the editor to leave a comment.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {threads.map((thread) => (
        <ThreadWrapper key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
