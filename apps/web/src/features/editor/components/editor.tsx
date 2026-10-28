"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  FileText,
  FileDown,
  MessageSquare,
  Printer,
  X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import SeedTemplatePlugin from "./plugins/seed-template-plugin";
import { useThreads } from "@liveblocks/react/suspense";
import {
  CommentComposer,
  CommentThreadList,
} from "@/features/comments/components/comments";
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
  templateId,
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
  /** P4-1: the room metadata's templateId, if this document was created from a starter template. */
  templateId?: string;
  discussionOpen?: boolean;
  onDiscussionOpenChange?: (open: boolean) => void;
  /** P2-5: whether this document has any indexed chunks to chat about. */
  hasChatSource?: boolean;
  rightPanelTab?: RightPanelTab;
  onRightPanelTabChange?: (tab: RightPanelTab) => void;
}) {
  const status = useIsEditorReady();
  const { threads } = useThreads();
  // Desktop Discussion/Chat panel visibility — same collapse-to-floating-
  // toggle pattern as the left outline panel (document-sidebar.tsx):
  // closing it removes the panel's width reservation entirely instead of
  // leaving a gutter. Local to this component (unlike the outline panel's
  // `sidebarVisible`, which had to be lifted to `collaborative-room.tsx`)
  // since both the panel and the canvas offset it affects live here.
  const [rightPanelVisible, setRightPanelVisible] = useState(true);

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
      {status && <SeedTemplatePlugin templateId={templateId} />}

      {/* Persistent second header row (Google Docs-style): the formatting
          toolbar on the left, Export on the right — Collaborators/Share
          live in `document-navbar.tsx` now, next to the account avatar,
          not here. Rendered unconditionally (not gated on
          `status`/`currentUserType`) since Export is meaningful for
          viewers too; only the formatting commands themselves are
          editor-only. The toolbar still has to live inside this
          `LexicalComposer` (it calls `useLexicalComposerContext()`), so
          it's rendered here and positioned via `fixed` rather than
          lifted into the navbar component itself, which sits outside
          this tree. */}
      <div className="fixed top-16 inset-x-0 z-40 h-12 flex items-center justify-between gap-2 px-4 md:px-8 bg-background border-b border-border/50">
        {/* Fade mask on the trailing edge hints there's more to scroll to
            — on a phone this toolbar holds 15+ buttons (undo/redo, bold/
            italic/underline/strikethrough, alignment, headings, lists)
            that don't all fit, and `overflow-x-auto` alone gave no sign
            anything was being clipped. The mask is a fixed cosmetic
            affordance (not conditional on actual overflow state), same
            as a tab strip's fade — cheap and always correct enough. */}
        <div
          className="flex items-center overflow-x-auto no-scrollbar [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] md:[mask-image:none]"
        >
          {status && currentUserType === "editor" && <ToolbarPlugin />}
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {/* Hidden below `xl` — same reasoning as Collaborators in the
              navbar: on tablet/mobile widths this row is already tight
              with the formatting toolbar, so Export drops out there and
              only reappears once there's real room for it. */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                aria-label="Export document"
                className="hidden xl:flex items-center gap-1.5 rounded px-2.5 py-2 hover:bg-muted transition-colors"
              >
                <Download className="size-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Export
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              <button
                onClick={() => exportRef?.current?.exportMarkdown()}
                className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <FileDown className="size-4 text-muted-foreground" />
                Markdown
              </button>
              <button
                onClick={() => exportRef?.current?.exportPlainText()}
                className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <FileText className="size-4 text-muted-foreground" />
                Plain Text
              </button>
              <button
                onClick={() => exportRef?.current?.exportPdf()}
                className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Printer className="size-4 text-muted-foreground" />
                Print / PDF
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-1 w-full">
        {/* Editor Content Canvas — a grey canvas behind an A4-proportioned
            "page" (Google Docs-style). A previous version painted repeating
            page-break bands onto the page via `background-image` to fake
            stacked sheets, but since this is a single continuous
            Lexical/Yjs tree with no real per-page layout/reflow, those
            bands had no relationship to where text actually fell and ended
            up slicing across the middle of random lines. Dropped that —
            real multi-page pagination would need actual height-aware
            content splitting, which is a separate, much bigger feature. */}
        <div
          className={cn(
            "flex-1 flex flex-col items-center py-6 px-3 sm:py-12 sm:px-8 overflow-y-auto no-scrollbar bg-muted/40",
            rightPanelVisible && "xl:mr-80"
          )}
        >
          {/* Writing Area (The "Page") — padding scales down below `sm` so
              the actual writing area isn't squeezed to a sliver on a
              phone: at 375px, the old fixed `p-16` (64px/side) left only
              ~183px of real content width after the wrapper's own `px-8`.
              `p-16` is still used at `lg`+ so the A4 page keeps its
              print-like margins once there's room for them. */}
          {!status ? (
            <Loader className="min-h-[400px]" />
          ) : (
            <article className="w-[210mm] max-w-full p-6 sm:p-10 lg:p-16 bg-card shadow-[0_8px_24px_rgba(0,0,0,0.08)] min-h-[297mm] border border-border/10">
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
          {/* Desktop — collapses to a floating round toggle when closed,
              same pattern as the outline panel, rather than a rail. */}
          {rightPanelVisible ? (
            <aside className="fixed right-0 top-28 flex h-[calc(100vh-112px)] w-80 flex-col overflow-hidden border-l border-border/50 hidden xl:flex bg-background">
              <div className="flex items-center justify-between px-6 pt-10 pb-6 shrink-0">
                <button
                  onClick={() => setRightPanelVisible(false)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
                <RightPanelTabs
                  hasChatSource={hasChatSource}
                  activeTab={rightPanelTab}
                  onTabChange={onRightPanelTabChange}
                />
              </div>
              {hasChatSource && rightPanelTab === "chat" ? (
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pb-12">
                  <ChatPanel roomId={roomId} />
                </div>
              ) : (
                <>
                  {/* Composer stays put, same scroll-behind-the-header
                      treatment as the document outline sidebar
                      (document-sidebar.tsx): it's outside the
                      overflow-y-auto region below, so only the thread
                      list scrolls underneath it. */}
                  <div className="px-4 pb-4 shrink-0">
                    <CommentComposer />
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pb-12">
                    <CommentThreadList />
                  </div>
                </>
              )}
            </aside>
          ) : (
            <button
              onClick={() => setRightPanelVisible(true)}
              aria-label="Show discussion panel"
              className="fixed right-4 top-32 z-10 hidden xl:flex items-center justify-center size-9 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <MessageSquare className="size-4 text-foreground" />
            </button>
          )}
          {/* Mobile */}
          <Sheet open={discussionOpen} onOpenChange={onDiscussionOpenChange}>
            <SheetContent
              side="right"
              className="w-80 p-0 bg-background flex flex-col overflow-hidden"
            >
              <SheetTitle className="sr-only">Discussion</SheetTitle>
              <div className="flex items-center px-6 pt-10 pb-6 shrink-0">
                <RightPanelTabs
                  hasChatSource={hasChatSource}
                  activeTab={rightPanelTab}
                  onTabChange={onRightPanelTabChange}
                />
              </div>
              {hasChatSource && rightPanelTab === "chat" ? (
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pb-12">
                  <ChatPanel roomId={roomId} />
                </div>
              ) : (
                <>
                  <div className="px-4 pb-4 shrink-0">
                    <CommentComposer />
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pb-12">
                    <CommentThreadList />
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
          <FloatingComposer className="w-[350px]" />
          <FloatingThreads threads={threads} />
        </LiveblocksPlugin>
      </div>
    </LexicalComposer>
  );
}
