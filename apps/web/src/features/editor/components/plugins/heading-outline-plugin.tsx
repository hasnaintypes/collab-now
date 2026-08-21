"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import { $isHeadingNode } from "@lexical/rich-text";
import { useCallback, useEffect } from "react";

export type HeadingEntry = {
  key: string;
  text: string;
  tag: string;
};

export default function HeadingOutlinePlugin({
  onHeadingsChange,
  scrollRef,
}: {
  onHeadingsChange: (headings: HeadingEntry[]) => void;
  scrollRef: React.MutableRefObject<((key: string) => void) | null>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    scrollRef.current = (key: string) => {
      const element = editor.getElementByKey(key);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }, [editor, scrollRef]);

  const extractHeadings = useCallback(() => {
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const headings: HeadingEntry[] = [];

      root.getChildren().forEach((node) => {
        if ($isHeadingNode(node)) {
          const text = node.getTextContent();
          if (text.trim()) {
            headings.push({
              key: node.getKey(),
              text,
              tag: node.getTag(),
            });
          }
        }
      });

      onHeadingsChange(headings);
    });
  }, [editor, onHeadingsChange]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      extractHeadings();
    });
  }, [editor, extractHeadings]);

  return null;
}
