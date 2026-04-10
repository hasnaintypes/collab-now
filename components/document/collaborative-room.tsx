"use client";

import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { useRef, useState, useEffect, useCallback } from "react";
import { Pencil, FileText, X } from "lucide-react";
import Link from "next/link";
import { LogoIcon } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { updateDocument } from "@/lib/actions/room.actions";
import ActiveCollaborators from "./active-collaborators";
import ShareDialog from "./share-dialog";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/components/shared/notifications";
import Loader from "@/components/shared/loader";
import { Editor } from "@/components/editor/editor";
import type { HeadingEntry } from "@/components/editor/plugins/heading-outline-plugin";
import { cn } from "@/lib/utils";

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
  const [headings, setHeadings] = useState<HeadingEntry[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [outlineVisible, setOutlineVisible] = useState(true);
  const [activeHeadingKey, setActiveHeadingKey] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollToHeadingRef = useRef<((key: string) => void) | null>(null);

  const handleHeadingsChange = useCallback((h: HeadingEntry[]) => {
    setHeadings(h);
  }, []);

  const handleWordCountChange = useCallback((count: number) => {
    setWordCount(count);
  }, []);

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
        <div className="min-h-screen bg-background">
          {/* ── Fixed Top NavBar ── */}
          <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-8 h-16 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
            <div className="flex items-center gap-8">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 font-extrabold tracking-tighter text-xl"
              >
                <LogoIcon size={24} />
                CollabNow
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="mr-2">
                <ActiveCollaborators />
              </div>
              <span className="px-4 py-1.5 text-sm font-medium bg-muted text-foreground">
                {currentUserType === "editor" ? "Edit" : "View"}
              </span>
              <ShareDialog
                roomId={roomId}
                collaborators={users}
                creatorId={roomMetadata.creatorId}
                currentUserType={currentUserType}
              />
              <div className="flex gap-1 ml-1">
                <Notifications />
                <UserButton
                  name={currentUser.name}
                  email={currentUser.email}
                  avatar={currentUser.avatar}
                />
              </div>
            </div>
          </nav>

          {/* ── Fixed Left Sidebar ── */}
          <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 flex-col py-6 bg-muted/50 border-r border-border/50 hidden lg:flex overflow-y-auto no-scrollbar">
            {/* Document Title */}
            <div className="px-5 mb-6">
              <div
                ref={containerRef}
                className="flex items-center gap-3"
              >
                <div className="flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground text-xs font-bold rounded-sm">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  {editing && !loading ? (
                    <Input
                      type="text"
                      value={documentTitle}
                      ref={inputRef}
                      placeholder="Enter title"
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      className="h-7 w-full border-border/50 text-xs font-bold"
                    />
                  ) : (
                    <button
                      onClick={() =>
                        currentUserType === "editor" && setEditing(true)
                      }
                      className="group flex items-center gap-1 w-full text-left"
                    >
                      <p className="text-sm font-bold truncate tracking-tight">
                        {documentTitle}
                      </p>
                      {currentUserType === "editor" && (
                        <Pencil className="size-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      )}
                    </button>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {currentUser.name}
                  </p>
                  {loading && (
                    <span className="text-[10px] text-muted-foreground">
                      saving...
                    </span>
                  )}
                  {currentUserType !== "editor" && (
                    <span className="inline-block mt-1 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                      View only
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-border/50 mx-4 mb-4" />

            {/* Document Outline */}
            {outlineVisible && (
              <div className="flex-1 px-3">
                <div className="flex items-center justify-between px-2 mb-3">
                  <h3 className="text-[11px] font-semibold text-muted-foreground">
                    Outline
                  </h3>
                  <button
                    onClick={() => setOutlineVisible(false)}
                    className="p-0.5 rounded hover:bg-muted transition-colors"
                  >
                    <X className="size-3 text-muted-foreground" />
                  </button>
                </div>

                {headings.length === 0 ? (
                  <p className="px-2 py-6 text-xs text-muted-foreground text-center leading-relaxed">
                    Add headings to your document to see an outline here.
                  </p>
                ) : (
                  <nav className="flex flex-col gap-0.5">
                    {headings.map((h) => (
                      <button
                        key={h.key}
                        onClick={() => {
                          scrollToHeadingRef.current?.(h.key);
                          setActiveHeadingKey(h.key);
                        }}
                        className={cn(
                          "w-full text-left py-1.5 rounded-md text-[13px] leading-snug truncate transition-colors hover:bg-muted",
                          h.tag === "h1" && "px-2 font-medium",
                          h.tag === "h2" && "pl-5 pr-2",
                          (h.tag === "h3" ||
                            h.tag === "h4" ||
                            h.tag === "h5" ||
                            h.tag === "h6") &&
                            "pl-8 pr-2 text-[12px]",
                          activeHeadingKey === h.key
                            ? "text-primary bg-primary/5 border-l-2 border-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        {h.text}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            )}

            {!outlineVisible && (
              <div className="px-5">
                <button
                  onClick={() => setOutlineVisible(true)}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Show outline
                </button>
              </div>
            )}
          </aside>

          {/* ── Main Content Area ── */}
          <main className="lg:ml-64 pt-16 pb-12 min-h-screen bg-background flex">
            <Editor
              roomId={roomId}
              currentUserType={currentUserType}
              onHeadingsChange={handleHeadingsChange}
              onWordCountChange={handleWordCountChange}
              scrollToHeadingRef={scrollToHeadingRef}
            />
          </main>

          {/* ── Fixed Footer Status Bar ── */}
          <footer className="fixed bottom-0 w-full z-40 flex items-center justify-between px-8 py-3 bg-background border-t border-border/30 text-[11px] tracking-wide">
            <div className="flex items-center gap-6">
              <span className="text-foreground">
                {currentUserType === "editor" ? "Editing" : "Viewing"}
              </span>
              <span className="text-muted-foreground">
                {wordCount} {wordCount === 1 ? "word" : "words"}
              </span>
              <span className="text-muted-foreground">
                ~{Math.max(1, Math.round(wordCount / 200))}m read
              </span>
              <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-200">
                English (US)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-muted-foreground">All changes saved</span>
            </div>
          </footer>
        </div>
      </ClientSideSuspense>
    </RoomProvider>
  );
}
