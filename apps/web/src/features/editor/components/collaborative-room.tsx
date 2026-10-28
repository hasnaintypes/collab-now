"use client";

import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { useRef, useState, useCallback } from "react";
import { PanelLeft, MessageSquare, MessageCircleQuestion } from "lucide-react";
import Loader from "@/components/shared/loader";
import { cn } from "@/lib/utils";
import { Editor } from "./editor";
import type { HeadingEntry } from "./plugins/heading-outline-plugin";
import type { ExportFunctions } from "./plugins/export-plugin";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import DocumentNavbar from "./document-navbar";
import DocumentSidebar, { DocumentSidebarContent } from "./document-sidebar";
import DocumentFooter from "./document-footer";
import type { CollaborativeRoomProps } from "../types";

export default function CollaborativeRoom({
  roomId,
  roomMetadata,
  users,
  currentUserType,
  currentUser,
  hasChatSource,
}: CollaborativeRoomProps) {
  const [headings, setHeadings] = useState<HeadingEntry[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [activeHeadingKey, setActiveHeadingKey] = useState<string | null>(null);
  // Desktop outline panel visibility — distinct from `sidebarOpen` below,
  // which is the mobile `Sheet`'s own open state. Closing the desktop panel
  // removes it entirely (grey canvas, recentered editor) rather than
  // collapsing it to a thin rail.
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  // P2-5: which tab the Discussion/Chat panel shows — owned here (not
  // inside `Editor`) so both the desktop `<aside>` and the mobile `Sheet`
  // (rendered in `editor.tsx`) and the two mobile trigger buttons below all
  // stay in sync, same reason `discussionOpen` itself is lifted this high.
  const [rightPanelTab, setRightPanelTab] = useState<"discussion" | "chat">(
    "discussion"
  );

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

  const outlineProps = {
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
          />

          {/* Desktop sidebar — collapses to a floating toggle, not a rail,
              when closed (see document-sidebar.tsx). */}
          <DocumentSidebar
            {...outlineProps}
            visible={sidebarVisible}
            onOpen={() => setSidebarVisible(true)}
            onClose={() => setSidebarVisible(false)}
          />

          {/* Mobile sidebar sheet */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-72 p-0 bg-[#0a0a0a]">
              <SheetTitle className="sr-only">Document Outline</SheetTitle>
              <DocumentSidebarContent
                {...outlineProps}
                onClose={() => setSidebarOpen(false)}
              />
            </SheetContent>
          </Sheet>

          {/* pt-28/top-* offsets below account for the two-row header
              (DocumentNavbar's h-16 + editor.tsx's fixed h-12 toolbar row
              = 112px / top-28), reserved at this fixed height regardless
              of whether the toolbar row is actually rendered (it's hidden
              for viewers) so the layout doesn't shift between roles.
              The left margin only applies while the desktop outline panel
              is open — closing it should actually give the editor the
              width back and recenter it, not just leave a gutter. */}
          <main
            className={cn(
              "pt-28 pb-12 min-h-screen bg-background flex relative",
              sidebarVisible ? "xl:ml-72" : "xl:ml-0"
            )}
          >
            {/* Mobile toggle buttons — `xl:hidden` now, matching the
                outline panel's own breakpoint (document-sidebar.tsx) and
                the discussion panel's existing `xl:` gate, so both
                sidebars appear/disappear together at the same width
                instead of the outline popping in a breakpoint earlier
                and leaving an asymmetric tablet layout. */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed left-4 top-32 z-10 p-2 text-muted-foreground hover:text-foreground transition-colors xl:hidden"
            >
              <PanelLeft className="size-5" />
            </button>
            <button
              onClick={() => {
                setRightPanelTab("discussion");
                setDiscussionOpen(true);
              }}
              className="fixed right-4 top-32 z-10 p-2 text-muted-foreground hover:text-foreground transition-colors xl:hidden"
            >
              <MessageSquare className="size-5" />
            </button>
            {hasChatSource && (
              <button
                onClick={() => {
                  setRightPanelTab("chat");
                  setDiscussionOpen(true);
                }}
                className="fixed right-4 top-44 z-10 p-2 text-muted-foreground hover:text-foreground transition-colors xl:hidden"
              >
                <MessageCircleQuestion className="size-5" />
              </button>
            )}

            <Editor
              roomId={roomId}
              currentUserType={currentUserType}
              onHeadingsChange={handleHeadingsChange}
              onWordCountChange={handleWordCountChange}
              scrollToHeadingRef={scrollToHeadingRef}
              exportRef={exportRef}
              documentTitle={roomMetadata.title}
              templateId={roomMetadata.templateId}
              discussionOpen={discussionOpen}
              onDiscussionOpenChange={setDiscussionOpen}
              hasChatSource={hasChatSource}
              rightPanelTab={rightPanelTab}
              onRightPanelTabChange={setRightPanelTab}
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
