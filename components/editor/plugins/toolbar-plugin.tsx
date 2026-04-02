"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $isRootOrShadowRoot,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { $createHeadingNode, $isHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $findMatchingParent } from "@lexical/utils";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
} from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const LowPriority = 1;

function ToolbarButton({
  onClick,
  active,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-30",
        active && "bg-muted text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const activeBlock = useActiveBlock();

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => $updateToolbar());
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => { $updateToolbar(); return false; },
        LowPriority
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => { setCanUndo(payload); return false; },
        LowPriority
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => { setCanRedo(payload); return false; },
        LowPriority
      )
    );
  }, [editor, $updateToolbar]);

  function toggleBlock(type: "h1" | "h2" | "h3") {
    const selection = $getSelection();
    if (activeBlock === type) {
      return $setBlocksType(selection, () => $createParagraphNode());
    }
    return $setBlocksType(selection, () => $createHeadingNode(type));
  }

  const iconSize = "size-4";

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-background px-2 py-1.5">
      <ToolbarButton onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} disabled={!canUndo} ariaLabel="Undo">
        <Undo2 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} disabled={!canRedo} ariaLabel="Redo">
        <Redo2 className={iconSize} />
      </ToolbarButton>
      <Divider />
      <ToolbarButton onClick={() => editor.update(() => toggleBlock("h1"))} active={activeBlock === "h1"} ariaLabel="Heading 1">
        <Heading1 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.update(() => toggleBlock("h2"))} active={activeBlock === "h2"} ariaLabel="Heading 2">
        <Heading2 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.update(() => toggleBlock("h3"))} active={activeBlock === "h3"} ariaLabel="Heading 3">
        <Heading3 className={iconSize} />
      </ToolbarButton>
      <Divider />
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")} active={isBold} ariaLabel="Bold">
        <Bold className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")} active={isItalic} ariaLabel="Italic">
        <Italic className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")} active={isUnderline} ariaLabel="Underline">
        <Underline className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")} active={isStrikethrough} ariaLabel="Strikethrough">
        <Strikethrough className={iconSize} />
      </ToolbarButton>
      <Divider />
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")} ariaLabel="Align Left">
        <AlignLeft className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")} ariaLabel="Align Center">
        <AlignCenter className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")} ariaLabel="Align Right">
        <AlignRight className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify")} ariaLabel="Justify">
        <AlignJustify className={iconSize} />
      </ToolbarButton>
    </div>
  );
}

function useActiveBlock() {
  const [editor] = useLexicalComposerContext();
  const subscribe = useCallback(
    (onStoreChange: () => void) => editor.registerUpdateListener(onStoreChange),
    [editor]
  );
  const getSnapshot = useCallback(() => {
    return editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return null;
      const anchor = selection.anchor.getNode();
      let element =
        anchor.getKey() === "root"
          ? anchor
          : $findMatchingParent(anchor, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });
      if (element === null) element = anchor.getTopLevelElementOrThrow();
      if ($isHeadingNode(element)) return element.getTag();
      return element.getType();
    });
  }, [editor]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
