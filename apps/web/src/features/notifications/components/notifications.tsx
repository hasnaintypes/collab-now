"use client";

import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  InboxNotification,
  InboxNotificationList,
  LiveblocksUiConfig,
} from "@liveblocks/react-ui";
import {
  useInboxNotifications,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react/suspense";
import { ReactNode } from "react";

export default function Notifications() {
  const { inboxNotifications } = useInboxNotifications();
  const { count } = useUnreadInboxNotificationsCount();

  const unreadNotifications = inboxNotifications.filter(
    (n) => !n.readAt
  );

  return (
    <Popover>
      <PopoverTrigger className="relative flex size-9 items-center justify-center rounded-md transition-colors hover:bg-muted">
        <Bell className="size-4 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold tracking-tight">Notifications</p>
        </div>
        <LiveblocksUiConfig
          overrides={{
            INBOX_NOTIFICATION_TEXT_MENTION: (user: ReactNode) => (
              <>{user} mentioned you.</>
            ),
          }}
        >
          <InboxNotificationList className="max-h-[400px] overflow-y-auto">
            {unreadNotifications.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No new notifications
              </p>
            )}
            {unreadNotifications.map((notification) => (
              <InboxNotification
                key={notification.id}
                inboxNotification={notification}
                href={`/documents/${notification.roomId}`}
                showActions={false}
                kinds={{
                  thread: (props) => (
                    <InboxNotification.Thread
                      {...props}
                      showActions={false}
                      showRoomName={false}
                    />
                  ),
                  textMention: (props) => (
                    <InboxNotification.TextMention
                      {...props}
                      showRoomName={false}
                    />
                  ),
                  $documentAccess: (props) => (
                    <InboxNotification.Custom
                      {...props}
                      title={
                        props.inboxNotification.activities[0].data
                          .title as string
                      }
                      aside={
                        <InboxNotification.Icon className="bg-transparent">
                          <Bell className="size-5 text-muted-foreground" />
                        </InboxNotification.Icon>
                      }
                    >
                      {props.children}
                    </InboxNotification.Custom>
                  ),
                }}
              />
            ))}
          </InboxNotificationList>
        </LiveblocksUiConfig>
      </PopoverContent>
    </Popover>
  );
}
