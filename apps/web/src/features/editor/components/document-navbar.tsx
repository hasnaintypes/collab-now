"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Pencil } from "lucide-react";
import { LogoIcon } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { updateDocument } from "@/features/documents/actions/room.actions";
import ActiveCollaborators from "@/features/documents/components/active-collaborators";
import ShareDialog from "@/features/documents/components/share-dialog";
import UserButton from "@/components/shared/user-button";

type SaveStatus = "idle" | "saving" | "saved";

/**
 * Inline document-title editing, lifted here from `document-sidebar.tsx`
 * (Google Docs keeps title editing in the header, not a side panel) — same
 * click-to-edit / Enter-to-save / click-outside-to-save behavior as before,
 * now sharing one `saveTitle` path between both triggers so the Docs-style
 * "Saving…" / "Saved" status next to the title reflects either one.
 */
function DocumentTitle({
  roomId,
  title,
  editable,
}: {
  roomId: string;
  title: string;
  editable: boolean;
}) {
  const [documentTitle, setDocumentTitle] = useState(title);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [editing, setEditing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(title);

  const saveTitle = useCallback(
    async (value: string) => {
      if (value === lastSavedRef.current) return;
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      setStatus("saving");
      const result = await updateDocument(roomId, value);
      if (result.success) {
        lastSavedRef.current = value;
        setStatus("saved");
        savedTimeoutRef.current = setTimeout(() => setStatus("idle"), 2000);
      } else {
        console.error(`Failed to update title: ${result.error}`);
        setStatus("idle");
      }
    },
    [roomId]
  );

  const handleTitleKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      await saveTitle(documentTitle);
      setEditing(false);
    } else if (e.key === "Escape") {
      setDocumentTitle(lastSavedRef.current);
      setEditing(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setEditing(false);
        saveTitle(documentTitle);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [documentTitle, saveTitle]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-3 min-w-0 flex-1 max-w-xl"
    >
      {editing ? (
        <Input
          type="text"
          value={documentTitle}
          ref={inputRef}
          placeholder="Enter title"
          onChange={(e) => setDocumentTitle(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          className="h-9 w-full max-w-xl border-border/50 text-lg md:text-lg font-medium"
        />
      ) : (
        <button
          onClick={() => editable && setEditing(true)}
          className="group flex items-center gap-1.5 min-w-0 text-left"
        >
          <p className="text-lg font-medium truncate max-w-28 sm:max-w-48 md:max-w-md">
            {documentTitle}
          </p>
          {editable && (
            <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </button>
      )}

      {/* Docs-style save status, next to the title rather than tucked
          under it — "Saving…" while the request is in flight, a brief
          "Saved" confirmation afterward, then nothing once idle. */}
      {status !== "idle" && (
        <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          {status === "saving" ? (
            "Saving…"
          ) : (
            <>
              <Check className="size-3.5 text-muted-foreground" />
              Saved
            </>
          )}
        </span>
      )}

      {!editable && (
        <span className="hidden sm:inline-block shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          View only
        </span>
      )}
    </div>
  );
}

export default function DocumentNavbar({
  roomId,
  roomMetadata,
  users,
  currentUserType,
  currentUser,
}: {
  roomId: string;
  roomMetadata: RoomMetadata;
  users: User[];
  currentUserType: UserType;
  currentUser: MinimalUser;
}) {
  return (
    <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-4 md:px-8 h-16 bg-background border-b border-border/50">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 font-extrabold tracking-tighter text-xl shrink-0"
        >
          <LogoIcon size={24} />
        </Link>
        <div className="h-6 w-px bg-border/50 hidden sm:block shrink-0" />
        <DocumentTitle
          roomId={roomId}
          title={roomMetadata.title}
          editable={currentUserType === "editor"}
        />
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Hidden until `xl` — this is the decorative "who's here" stack,
            not essential chrome, so it's the first thing dropped on
            tablet/mobile widths to keep the header from getting crowded.
            Share stays visible at every width since it's an actual
            action, not just a presence display. */}
        <div className="hidden xl:block">
          <ActiveCollaborators />
        </div>
        <ShareDialog
          roomId={roomId}
          collaborators={users}
          creatorId={roomMetadata.creatorId}
          currentUserType={currentUserType}
        />
        <div className="h-6 w-px bg-border/50 hidden sm:block shrink-0" />
        <UserButton
          name={currentUser.name}
          email={currentUser.email}
          avatar={currentUser.avatar}
        />
      </div>
    </nav>
  );
}
