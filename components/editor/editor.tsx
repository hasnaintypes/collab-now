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
import { useThreads } from "@liveblocks/react/suspense";
import Comments from "@/components/shared/comments";
import Loader from "@/components/shared/loader";
import { SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function Placeholder() {
  return (
    <div className="pointer-events-none absolute left-0 top-0 text-muted-foreground text-lg">
      Start writing...
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

        {/* Discussion Panel */}
        <LiveblocksPlugin>
          {/* Desktop */}
          <aside className="fixed right-0 top-16 h-[calc(100vh-64px)] w-80 border-l border-border/50 hidden xl:block overflow-y-auto no-scrollbar bg-background">
            <div className="flex items-center justify-between px-6 pt-10 pb-6">
              <h3 className="uppercase tracking-widest text-[10px] font-bold text-muted-foreground">
                Discussion
              </h3>
              <SlidersHorizontal className="size-3.5 text-muted-foreground cursor-pointer" />
            </div>
            <div className="px-4 pb-12">
              <Comments />
            </div>
          </aside>
          {/* Mobile */}
          <Sheet open={discussionOpen} onOpenChange={onDiscussionOpenChange}>
            <SheetContent side="right" className="w-80 p-0 overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between px-6 pt-10 pb-6">
                <h3 className="uppercase tracking-widest text-[10px] font-bold text-muted-foreground">
                  Discussion
                </h3>
              </div>
              <div className="px-4 pb-12">
                <Comments />
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
