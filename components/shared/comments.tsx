"use client";

import { cn } from "@/lib/utils";
import { useIsThreadActive } from "@liveblocks/react-lexical";
import { Composer, Thread } from "@liveblocks/react-ui";
import { useThreads } from "@liveblocks/react/suspense";
import type { ThreadData, BaseMetadata } from "@liveblocks/client";
import { MessageSquare } from "lucide-react";

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

export default function Comments() {
  const { threads } = useThreads();

  return (
    <div className="flex flex-col gap-4">
      <Composer className="rounded-sm border border-border/50" />
      {threads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="mb-3 size-8 text-muted-foreground/40" />
          <p className="text-xs font-medium text-muted-foreground">
            No comments yet
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            Select text in the editor to leave a comment.
          </p>
        </div>
      )}
      {threads.map((thread) => (
        <ThreadWrapper key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
