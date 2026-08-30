"use client";

import { useState, useTransition } from "react";
import {
  FileText,
  Trash2,
  UserPlus,
  UserCheck,
  UserMinus,
  UserX,
  LogOut,
  Share2,
  Archive,
  ArchiveRestore,
  Star,
  Loader2,
} from "lucide-react";
import { dateConverter } from "@/lib/utils";
import { getRecentActivity } from "@/features/workspace/actions/workspace.actions";
import { Button } from "@/components/ui/button";
import type { ActivityItem } from "../types";

const actionConfig: Record<
  string,
  { icon: typeof FileText; label: string; color: string }
> = {
  created: { icon: FileText, label: "created a document", color: "text-green-500" },
  deleted: { icon: Trash2, label: "deleted a document", color: "text-red-500" },
  shared: { icon: Share2, label: "shared a document", color: "text-blue-500" },
  invited: { icon: UserPlus, label: "invited a member", color: "text-violet-500" },
  joined: { icon: UserCheck, label: "joined the workspace", color: "text-emerald-500" },
  archived: { icon: Archive, label: "archived a document", color: "text-amber-500" },
  unarchived: { icon: ArchiveRestore, label: "unarchived a document", color: "text-amber-500" },
  starred: { icon: Star, label: "starred a document", color: "text-yellow-500" },
  unstarred: { icon: Star, label: "unstarred a document", color: "text-muted-foreground" },
  invite_revoked: { icon: UserX, label: "revoked an invite", color: "text-red-500" },
  member_removed: { icon: UserMinus, label: "removed a member", color: "text-red-500" },
  left_workspace: { icon: LogOut, label: "left the workspace", color: "text-muted-foreground" },
};

export default function ActivityFeed({
  workspaceId,
  activities: initialActivities,
  nextCursor: initialNextCursor,
}: {
  workspaceId: string;
  activities: ActivityItem[];
  nextCursor: string | null;
}) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [isLoadingMore, startTransition] = useTransition();

  const handleLoadMore = () => {
    if (!cursor || isLoadingMore) return;
    startTransition(async () => {
      const result = await getRecentActivity(workspaceId, { cursor });
      if (!result.success) return;
      setActivities((prev) => [...prev, ...result.data.activities]);
      setCursor(result.data.nextCursor);
    });
  };

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border/50 py-24 text-center">
        <div className="mb-5 flex size-16 items-center justify-center rounded-sm bg-muted">
          <FileText className="size-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-xl font-bold tracking-tight">
          No activity yet
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Activity will appear here as you and your team create, share, and
          collaborate on documents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => {
        const config = actionConfig[activity.action] || {
          icon: FileText,
          label: activity.action,
          color: "text-muted-foreground",
        };
        const Icon = config.icon;
        const meta = activity.metadata ? JSON.parse(activity.metadata) : {};

        return (
          <div
            key={activity.id}
            className="flex items-center gap-4 rounded-sm px-4 py-3.5 transition-colors hover:bg-muted/40"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className={`size-4 ${config.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-semibold">{activity.userName}</span>{" "}
                {config.label}
                {meta.title && (
                  <>
                    {" "}
                    <span className="font-medium">{meta.title}</span>
                  </>
                )}
                {meta.email && (
                  <>
                    {" "}
                    <span className="text-muted-foreground">
                      {meta.email}
                    </span>
                  </>
                )}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {dateConverter(activity.createdAt)}
            </span>
          </div>
        );
      })}

      {cursor && (
        <div className="flex justify-center pt-8">
          <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
