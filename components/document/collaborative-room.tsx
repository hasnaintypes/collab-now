"use client";

import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { useRef, useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { updateDocument } from "@/lib/actions/room.actions";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import ActiveCollaborators from "./active-collaborators";
import ShareDialog from "./share-dialog";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/components/shared/notifications";
import Loader from "@/components/shared/loader";
import { Editor } from "@/components/editor/editor";

export default function CollaborativeRoom({
  roomId,
  roomMetadata,
  users,
  currentUserType,
  currentUser,
}: CollaborativeRoomProps) {
  const [documentTitle, setDocumentTitle] = useState(roomMetadata.title);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTitleKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      setLoading(true);
      try {
        if (documentTitle !== roomMetadata.title) {
          const updated = await updateDocument(roomId, documentTitle);
          if (updated) setEditing(false);
        }
      } catch (error) {
        console.error(`Failed to update title: ${error}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setEditing(false);
        updateDocument(roomId, documentTitle);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [roomId, documentTitle]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  return (
    <RoomProvider id={roomId}>
      <ClientSideSuspense fallback={<Loader />}>
        <div className="flex min-h-screen flex-col bg-background">
          <DashboardHeader>
            <div
              ref={containerRef}
              className="flex items-center gap-2"
            >
              {editing && !loading ? (
                <Input
                  type="text"
                  value={documentTitle}
                  ref={inputRef}
                  placeholder="Enter title"
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  className="h-8 w-[200px] text-sm font-medium"
                />
              ) : (
                <p className="max-w-[200px] truncate text-sm font-medium">
                  {documentTitle}
                </p>
              )}
              {currentUserType === "editor" && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
              {currentUserType !== "editor" && !editing && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  View only
                </span>
              )}
              {loading && (
                <span className="text-xs text-muted-foreground">saving...</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <ActiveCollaborators />
              <Notifications />
              <ShareDialog
                roomId={roomId}
                collaborators={users}
                creatorId={roomMetadata.creatorId}
                currentUserType={currentUserType}
              />
              <UserButton
                name={currentUser.name}
                email={currentUser.email}
                avatar={currentUser.avatar}
              />
            </div>
          </DashboardHeader>

          <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
            <Editor roomId={roomId} currentUserType={currentUserType} />
          </main>
        </div>
      </ClientSideSuspense>
    </RoomProvider>
  );
}
