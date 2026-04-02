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
        "rounded-lg border bg-card p-2",
        isActive && "border-primary shadow-sm",
        thread.resolved && "opacity-40"
      )}
    />
  );
}

export default function Comments() {
  const { threads } = useThreads();

  return (
    <div className="w-full max-w-[350px] space-y-4 px-4 py-6">
      <Composer className="rounded-lg border bg-card p-2" />
      {threads.map((thread) => (
        <ThreadWrapper key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
