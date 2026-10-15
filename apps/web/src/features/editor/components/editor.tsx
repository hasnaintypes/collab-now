"use client";

import Theme from "./plugins/theme";
import ToolbarPlugin from "./plugins/toolbar-plugin";
import HeadingOutlinePlugin, {
  type HeadingEntry,
} from "./plugins/heading-outline-plugin";
import { HeadingNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  FloatingComposer,
  FloatingThreads,
  liveblocksConfig,
  LiveblocksPlugin,
  useIsEditorReady,
} from "@liveblocks/react-lexical";
import FloatingToolbar from "./plugins/floating-toolbar";
import WordCountPlugin from "./plugins/word-count-plugin";
import { ExportBridge, type ExportFunctions } from "./plugins/export-plugin";
import SeedNotesPlugin from "./plugins/seed-notes-plugin";
import { useThreads } from "@liveblocks/react/suspense";
import Comments from "@/features/comments/components/comments";
import ChatPanel from "@/features/chat/components/chat-panel";
import Loader from "@/components/shared/loader";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function Placeholder() {
  return (
    <div className="pointer-events-none absolute left-0 top-0 text-muted-foreground text-lg">
      Start writing...
    </div>
  );
}

type RightPanelTab = "discussion" | "chat";

/**
 * Tab switcher for the right-hand panel (Discussion / P2-5's "Ask about
 * this"). Shared between the desktop `<aside>` and the mobile `Sheet` so
 * both stay visually/behaviorally identical. Renders only the Discussion
 * label (no tabs at all) when `hasChatSource` is false, so a manually-
 * created document's panel looks exactly as it did before P2-5.
 */
function RightPanelTabs({
  hasChatSource,
  activeTab,
  onTabChange,
}: {
  hasChatSource: boolean;
  activeTab: RightPanelTab;
  onTabChange?: (tab: RightPanelTab) => void;
}) {
  if (!hasChatSource) {
    return (
      <h3 className="uppercase tracking-widest text-[10px] font-bold text-muted-foreground">
        Discussion
      </h3>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => onTabChange?.("discussion")}
        className={cn(
          "uppercase tracking-widest text-[10px] font-bold transition-colors",
          activeTab === "discussion"
            ? "text-foreground"
            : "text-muted-foreground/50 hover:text-muted-foreground"
        )}
      >
        Discussion
      </button>
      <button
        onClick={() => onTabChange?.("chat")}
        className={cn(
          "uppercase tracking-widest text-[10px] font-bold transition-colors",
          activeTab === "chat"
            ? "text-foreground"
            : "text-muted-foreground/50 hover:text-muted-foreground"
        )}
      >
        Ask about this
      </button>
    </div>
  );
}

export function Editor({
  roomId,
  currentUserType,
  onHeadingsChange,
  onWordCountChange,
  scrollToHeadingRef,
  exportRef,
  documentTitle,
  discussionOpen,
  onDiscussionOpenChange,
  hasChatSource = false,
  rightPanelTab = "discussion",
  onRightPanelTabChange,
}: {
  roomId: string;
  currentUserType: UserType;
  onHeadingsChange: (headings: HeadingEntry[]) => void;
  onWordCountChange?: (wordCount: number) => void;
  scrollToHeadingRef: React.MutableRefObject<((key: string) => void) | null>;
  exportRef?: React.MutableRefObject<ExportFunctions | null>;
  documentTitle?: string;
  discussionOpen?: boolean;
  onDiscussionOpenChange?: (open: boolean) => void;
  /** P2-5: whether this document has any indexed chunks to chat about. */
  hasChatSource?: boolean;
  rightPanelTab?: RightPanelTab;
  onRightPanelTabChange?: (tab: RightPanelTab) => void;
}) {
  const status = useIsEditorReady();
  const { threads } = useThreads();

  const initialConfig = liveblocksConfig({
    namespace: "Editor",
    nodes: [HeadingNode, ListNode, ListItemNode],
    onError: (error: Error) => {
      console.error(error);
      throw error;
    },
    theme: Theme,
    editable: currentUserType === "editor",
  });

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <HeadingOutlinePlugin
        onHeadingsChange={onHeadingsChange}
        scrollRef={scrollToHeadingRef}
      />
      {onWordCountChange && <WordCountPlugin onChange={onWordCountChange} />}
      {exportRef && <ExportBridge title={documentTitle || "document"} exportRef={exportRef} />}
      {/* Only mounted once `status` confirms the Yjs doc has actually
          synced — checking emptiness before that would race against the
          real synced state (see seed-notes-plugin.tsx). */}
      {status && <SeedNotesPlugin roomId={roomId} />}

      <div className="flex flex-1 w-full">
        {/* Editor Content Canvas */}
        <div className="flex-1 flex flex-col items-center py-12 px-8 overflow-y-auto no-scrollbar xl:mr-80">
          {/* Floating Minimalist Toolbar */}
          <div className="sticky top-4 z-10 mb-12">
            <ToolbarPlugin />
          </div>

          {/* Writing Area (The "Page") */}
          {!status ? (
            <Loader className="min-h-[400px]" />
          ) : (
            <article className="max-w-4xl w-full bg-card p-16 shadow-[0_20px_50px_rgba(0,0,0,0.02)] min-h-[1000px] border border-border/10">
              <div className="relative min-h-[800px]">
                <RichTextPlugin
                  contentEditable={
                    <ContentEditable className="outline-none min-h-[800px] text-foreground text-[1.125rem] leading-[1.8]" />
                  }
                  placeholder={<Placeholder />}
                  ErrorBoundary={LexicalErrorBoundary}
                />
              </div>
              {currentUserType === "editor" && <FloatingToolbar />}
              <ListPlugin />
              <HistoryPlugin />
              <AutoFocusPlugin />
            </article>
          )}
        </div>

        {/* Discussion / Chat Panel */}
        <LiveblocksPlugin>
          {/* Desktop */}
          <aside className="fixed right-0 top-16 h-[calc(100vh-64px)] w-80 border-l border-border/50 hidden xl:block overflow-y-auto no-scrollbar bg-background">
            <div className="flex items-center px-6 pt-10 pb-6">
              <RightPanelTabs
                hasChatSource={hasChatSource}
                activeTab={rightPanelTab}
                onTabChange={onRightPanelTabChange}
              />
            </div>
            <div className="px-4 pb-12">
              {hasChatSource && rightPanelTab === "chat" ? (
                <ChatPanel roomId={roomId} />
              ) : (
                <Comments />
              )}
            </div>
          </aside>
          {/* Mobile */}
          <Sheet open={discussionOpen} onOpenChange={onDiscussionOpenChange}>
            <SheetContent side="right" className="w-80 p-0 overflow-y-auto no-scrollbar">
              <SheetTitle className="sr-only">Discussion</SheetTitle>
              <div className="flex items-center px-6 pt-10 pb-6">
                <RightPanelTabs
                  hasChatSource={hasChatSource}
                  activeTab={rightPanelTab}
                  onTabChange={onRightPanelTabChange}
                />
              </div>
              <div className="px-4 pb-12">
                {hasChatSource && rightPanelTab === "chat" ? (
                  <ChatPanel roomId={roomId} />
                ) : (
                  <Comments />
                )}
              </div>
            </SheetContent>
          </Sheet>
          <FloatingComposer className="w-[350px]" />
          <FloatingThreads threads={threads} />
        </LiveblocksPlugin>
      </div>
    </LexicalComposer>
  );
}
