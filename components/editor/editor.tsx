"use client";

import Theme from "./plugins/theme";
import ToolbarPlugin from "./plugins/toolbar-plugin";
import { HeadingNode } from "@lexical/rich-text";
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
import { useThreads } from "@liveblocks/react/suspense";
import Comments from "@/components/shared/comments";
import Loader from "@/components/shared/loader";

function Placeholder() {
  return (
    <div className="pointer-events-none absolute left-8 top-8 text-muted-foreground">
      Start writing...
    </div>
  );
}

export function Editor({
  roomId,
  currentUserType,
}: {
  roomId: string;
  currentUserType: UserType;
}) {
  const status = useIsEditorReady();
  const { threads } = useThreads();

  const initialConfig = liveblocksConfig({
    namespace: "Editor",
    nodes: [HeadingNode],
    onError: (error: Error) => {
      console.error(error);
      throw error;
    },
    theme: Theme,
    editable: currentUserType === "editor",
  });

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs ring-1 ring-foreground/5">
        <ToolbarPlugin />
        <div className="flex flex-col items-center justify-start">
          {!status ? (
            <Loader className="min-h-[400px]" />
          ) : (
            <div className="relative w-full max-w-[800px] min-h-[600px] px-8 py-8">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable className="outline-none min-h-[500px] text-foreground" />
                }
                placeholder={<Placeholder />}
                ErrorBoundary={LexicalErrorBoundary}
              />
              {currentUserType === "editor" && <FloatingToolbar />}
              <HistoryPlugin />
              <AutoFocusPlugin />
            </div>
          )}
          <LiveblocksPlugin>
            <FloatingComposer className="w-[350px]" />
            <FloatingThreads threads={threads} />
            <Comments />
          </LiveblocksPlugin>
        </div>
      </div>
    </LexicalComposer>
  );
}
