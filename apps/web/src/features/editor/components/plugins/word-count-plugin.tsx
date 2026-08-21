"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";

export default function WordCountPlugin({
  onChange,
}: {
  onChange: (wordCount: number) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const text = $getRoot().getTextContent();
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        onChange(words);
      });
    });
  }, [editor, onChange]);

  return null;
}
