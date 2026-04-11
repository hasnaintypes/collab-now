"use client";

import { useCallback, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { $generateHtmlFromNodes } from "@lexical/html";

export function useExportDocument(title: string) {
  const [editor] = useLexicalComposerContext();

  const exportMarkdown = useCallback(() => {
    editor.getEditorState().read(() => {
      const markdown = $convertToMarkdownString(TRANSFORMERS);
      const blob = new Blob([markdown], { type: "text/markdown" });
      downloadBlob(blob, `${sanitizeFilename(title)}.md`);
    });
  }, [editor, title]);

  const exportPlainText = useCallback(() => {
    editor.getEditorState().read(() => {
      const text = $getRoot().getTextContent();
      const blob = new Blob([text], { type: "text/plain" });
      downloadBlob(blob, `${sanitizeFilename(title)}.txt`);
    });
  }, [editor, title]);

  const exportPdf = useCallback(() => {
    editor.getEditorState().read(() => {
      const html = $generateHtmlFromNodes(editor);
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.8; font-size: 16px; }
    h1 { font-size: 2em; font-weight: 800; margin: 1.5em 0 0.5em; letter-spacing: -0.02em; }
    h2 { font-size: 1.5em; font-weight: 700; margin: 1.3em 0 0.4em; letter-spacing: -0.01em; }
    h3 { font-size: 1.17em; font-weight: 600; margin: 1.2em 0 0.4em; }
    p { margin: 0.8em 0; }
    ul, ol { padding-left: 1.5em; margin: 0.8em 0; }
    li { margin: 0.3em 0; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${html}
</body>
</html>`);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    });
  }, [editor, title]);

  return { exportMarkdown, exportPlainText, exportPdf };
}

export type ExportFunctions = {
  exportMarkdown: () => void;
  exportPlainText: () => void;
  exportPdf: () => void;
};

export function ExportBridge({
  title,
  exportRef,
}: {
  title: string;
  exportRef: React.MutableRefObject<ExportFunctions | null>;
}) {
  const fns = useExportDocument(title);
  useEffect(() => {
    exportRef.current = fns;
  }, [fns, exportRef]);
  return null;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9\s-_]/g, "").trim() || "document";
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
