"use client";

import { cn } from "@/lib/utils";
import { useIsThreadActive } from "@liveblocks/react-lexical";
import { Composer, Thread } from "@liveblocks/react-ui";
import { useThreads } from "@liveblocks/react/suspense";
import type { ThreadData, BaseMetadata } from "@liveblocks/client";

function ThreadWrapper({ thread }: { thread: ThreadData<BaseMetadata> }) {
  const isActive = useIsThreadActive(thread.id);

  return (
    <Thread
      thread={thread}
      data-state={isActive ? "active" : null}
      className={cn(
        "rounded-lg border border-border/50 transition-all duration-200",
        isActive && "!border-l-2 !border-l-primary shadow-sm",
        thread.resolved && "opacity-40"
      )}
    />
  );
}

export default function Comments() {
  const { threads } = useThreads();

  return (
    <div className="space-y-3">
      <Composer className="rounded-lg border border-border/50" />
      {threads.map((thread) => (
        <ThreadWrapper key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
