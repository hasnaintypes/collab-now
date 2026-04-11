"use client";

import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { useRef, useState, useCallback } from "react";
import { PanelLeft, MessageSquare } from "lucide-react";
import Loader from "@/components/shared/loader";
import { Editor } from "@/components/editor/editor";
import type { HeadingEntry } from "@/components/editor/plugins/heading-outline-plugin";
import type { ExportFunctions } from "@/components/editor/plugins/export-plugin";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import DocumentNavbar from "./document-navbar";
import DocumentSidebar, { DocumentSidebarContent } from "./document-sidebar";
import DocumentFooter from "./document-footer";

export default function CollaborativeRoom({
  roomId,
  roomMetadata,
  users,
  currentUserType,
  currentUser,
}: CollaborativeRoomProps) {
  const [headings, setHeadings] = useState<HeadingEntry[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [activeHeadingKey, setActiveHeadingKey] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [discussionOpen, setDiscussionOpen] = useState(false);

  const scrollToHeadingRef = useRef<((key: string) => void) | null>(null);
  const exportRef = useRef<ExportFunctions | null>(null);

  const handleHeadingsChange = useCallback((h: HeadingEntry[]) => {
    setHeadings(h);
  }, []);

  const handleWordCountChange = useCallback((count: number) => {
    setWordCount(count);
  }, []);

  const handleScrollToHeading = (key: string) => {
    scrollToHeadingRef.current?.(key);
    setActiveHeadingKey(key);
    setSidebarOpen(false);
  };

  const sidebarProps = {
    roomId,
    title: roomMetadata.title,
    currentUserType,
    currentUserName: currentUser.name,
    headings,
    activeHeadingKey,
    onScrollToHeading: handleScrollToHeading,
  };

  return (
    <RoomProvider id={roomId}>
      <ClientSideSuspense fallback={<Loader />}>
        <div className="min-h-screen bg-background">
          <DocumentNavbar
            roomId={roomId}
            roomMetadata={roomMetadata}
            users={users}
            currentUserType={currentUserType}
            currentUser={currentUser}
            exportRef={exportRef}
          />

          {/* Desktop sidebar */}
          <DocumentSidebar {...sidebarProps} />

          {/* Mobile sidebar sheet */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-72 p-0 pt-6">
              <SheetTitle className="sr-only">Document Outline</SheetTitle>
              <DocumentSidebarContent {...sidebarProps} />
            </SheetContent>
          </Sheet>

          <main className="lg:ml-64 pt-16 pb-12 min-h-screen bg-background flex relative">
            {/* Mobile toggle buttons */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed left-4 top-20 z-10 p-2 text-muted-foreground hover:text-foreground transition-colors lg:hidden"
            >
              <PanelLeft className="size-5" />
            </button>
            <button
              onClick={() => setDiscussionOpen(true)}
              className="fixed right-4 top-20 z-10 p-2 text-muted-foreground hover:text-foreground transition-colors xl:hidden"
            >
              <MessageSquare className="size-5" />
            </button>

            <Editor
              roomId={roomId}
              currentUserType={currentUserType}
              onHeadingsChange={handleHeadingsChange}
              onWordCountChange={handleWordCountChange}
              scrollToHeadingRef={scrollToHeadingRef}
              exportRef={exportRef}
              documentTitle={roomMetadata.title}
              discussionOpen={discussionOpen}
              onDiscussionOpenChange={setDiscussionOpen}
            />
          </main>

          <DocumentFooter
            currentUserType={currentUserType}
            wordCount={wordCount}
          />
        </div>
      </ClientSideSuspense>
    </RoomProvider>
  );
}
