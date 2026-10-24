"use client";

import { ReactNode } from "react";
import {
  LiveblocksProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { getUsers, getDocumentUsers } from "@/features/documents/actions/user.actions";
import { useSession } from "@/features/auth/lib/client";
import { Loader2 } from "lucide-react";
import CommandPalette from "@/components/shared/command-palette";
import SaveShortcutToast from "@/components/shared/save-shortcut-toast";

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const currentUserEmail = session?.user?.email || "";
  const currentUserId = session?.user?.id;

  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      resolveUsers={async ({ userIds }) => {
        const users = await getUsers({ userIds });
        return users.map((u: { name: string; avatar: string }) => ({
          name: u.name,
          avatar: u.avatar,
        }));
      }}
      resolveMentionSuggestions={async ({ text, roomId }) => {
        const roomUsers = await getDocumentUsers({
          roomId,
          currentUser: currentUserEmail,
          text,
        });
        return roomUsers;
      }}
    >
      <ClientSideSuspense fallback={<Loader />}>
        {children}
      </ClientSideSuspense>
      {/* P4-2: Cmd/Ctrl+K and Cmd/Ctrl+S work on every page under this
          layout (dashboard, settings, an open document, etc.), not just
          wherever a page happens to render them — so they're mounted once
          here rather than duplicated per page. */}
      {currentUserId && <CommandPalette userId={currentUserId} />}
      <SaveShortcutToast />
    </LiveblocksProvider>
  );
}
