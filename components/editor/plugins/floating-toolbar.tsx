"use client";

import {
  autoUpdate,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { OPEN_FLOATING_COMPOSER_COMMAND } from "@liveblocks/react-lexical";
import type { LexicalEditor, LexicalNode } from "lexical";
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
} from "lexical";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from "@lexical/list";
import { $findMatchingParent } from "@lexical/utils";
import {
  $isRootOrShadowRoot,
} from "lexical";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  MessageSquarePlus,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

export default function FloatingToolbar() {
  const [editor] = useLexicalComposerContext();
  const [range, setRange] = useState<Range | null>(null);

  useEffect(() => {
    return editor.registerUpdateListener(({ tags }) => {
      return editor.getEditorState().read(() => {
        if (tags.has("collaboration")) return;
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || selection.isCollapsed()) {
          setRange(null);
          return;
        }
        const { anchor, focus } = selection;
        const r = createDOMRange(
          editor,
          anchor.getNode(),
          anchor.offset,
          focus.getNode(),
          focus.offset
        );
        setRange(r);
      });
    });
  }, [editor]);

  if (range === null) return null;
  return (
    <Toolbar
      range={range}
      onRangeChange={setRange}
      container={document.body}
    />
  );
}

function Toolbar({
  range,
  onRangeChange,
  container,
}: {
  range: Range;
  onRangeChange: (r: Range | null) => void;
  container: HTMLElement;
}) {
  const [editor] = useLexicalComposerContext();
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    bullet: false,
    number: false,
  });
  const padding = 20;
  const {
    refs: { setReference, setFloating },
    strategy,
    x,
    y,
  } = useFloating({
    strategy: "fixed",
    placement: "top",
    middleware: [
      flip({ padding, crossAxis: false }),
      offset(8),
      hide({ padding }),
      shift({ padding, limiter: limitShift() }),
      size({ padding }),
    ],
    whileElementsMounted: (...args) =>
      autoUpdate(...args, { animationFrame: true }),
  });

  const updateFormats = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        let bulletActive = false;
        let numberActive = false;
        const anchor = selection.anchor.getNode();
        const element =
          anchor.getKey() === "root"
            ? anchor
            : $findMatchingParent(anchor, (e) => {
                const parent = e.getParent();
                return parent !== null && $isRootOrShadowRoot(parent);
              }) || anchor.getTopLevelElementOrThrow();
        if ($isListNode(element)) {
          const listType = element.getListType();
          bulletActive = listType === "bullet";
          numberActive = listType === "number";
        }
        setFormats({
          bold: selection.hasFormat("bold"),
          italic: selection.hasFormat("italic"),
          underline: selection.hasFormat("underline"),
          strikethrough: selection.hasFormat("strikethrough"),
          bullet: bulletActive,
          number: numberActive,
        });
      }
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(() => updateFormats());
  }, [editor, updateFormats]);

  useLayoutEffect(() => {
    setReference({
      getBoundingClientRect: () => range.getBoundingClientRect(),
    });
  }, [setReference, range]);

  const iconSize = "size-3.5";

  return createPortal(
    <div
      ref={setFloating}
      style={{
        position: strategy,
        top: 0,
        left: 0,
        transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
        minWidth: "max-content",
      }}
    >
      <div className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-lg ring-1 ring-foreground/5">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
          }}
          className={cn(
            "rounded-md p-1.5 transition-colors hover:bg-muted",
            formats.bold && "bg-muted text-foreground"
          )}
        >
          <Bold className={iconSize} />
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
          }}
          className={cn(
            "rounded-md p-1.5 transition-colors hover:bg-muted",
            formats.italic && "bg-muted text-foreground"
          )}
        >
          <Italic className={iconSize} />
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
          }}
          className={cn(
            "rounded-md p-1.5 transition-colors hover:bg-muted",
            formats.underline && "bg-muted text-foreground"
          )}
        >
          <Underline className={iconSize} />
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
          }}
          className={cn(
            "rounded-md p-1.5 transition-colors hover:bg-muted",
            formats.strikethrough && "bg-muted text-foreground"
          )}
        >
          <Strikethrough className={iconSize} />
        </button>

        <div className="mx-0.5 h-5 w-px bg-border/50" />

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (formats.bullet) {
              editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            } else {
              editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
            }
          }}
          className={cn(
            "rounded-md p-1.5 transition-colors hover:bg-muted",
            formats.bullet && "bg-muted text-foreground"
          )}
        >
          <List className={iconSize} />
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            if (formats.number) {
              editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            } else {
              editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
            }
          }}
          className={cn(
            "rounded-md p-1.5 transition-colors hover:bg-muted",
            formats.number && "bg-muted text-foreground"
          )}
        >
          <ListOrdered className={iconSize} />
        </button>

        <div className="mx-0.5 h-5 w-px bg-border/50" />

        <button
          onMouseDown={(e) => {
            e.preventDefault();
            const isOpen = editor.dispatchCommand(
              OPEN_FLOATING_COMPOSER_COMMAND,
              undefined
            );
            if (isOpen) onRangeChange(null);
          }}
          className="rounded-md p-1.5 transition-colors hover:bg-muted"
        >
          <MessageSquarePlus className={iconSize} />
        </button>
      </div>
    </div>,
    container
  );
}

function getDOMTextNode(element: Node | null): Text | null {
  let node = element;
  while (node !== null) {
    if (node.nodeType === Node.TEXT_NODE) return node as Text;
    node = node.firstChild;
  }
  return null;
}

function getDOMIndexWithinParent(node: ChildNode): [ParentNode, number] {
  const parent = node.parentNode;
  if (parent === null) throw new Error("Should never happen");
  return [parent, Array.from(parent.childNodes).indexOf(node)];
}

export function createDOMRange(
  editor: LexicalEditor,
  anchorNode: LexicalNode,
  _anchorOffset: number,
  focusNode: LexicalNode,
  _focusOffset: number
): Range | null {
  const anchorKey = anchorNode.getKey();
  const focusKey = focusNode.getKey();
  const range = document.createRange();
  let anchorDOM: Node | Text | null = editor.getElementByKey(anchorKey);
  let focusDOM: Node | Text | null = editor.getElementByKey(focusKey);
  let anchorOffset = _anchorOffset;
  let focusOffset = _focusOffset;

  if ($isTextNode(anchorNode)) anchorDOM = getDOMTextNode(anchorDOM);
  if ($isTextNode(focusNode)) focusDOM = getDOMTextNode(focusDOM);

  if (
    anchorNode === undefined ||
    focusNode === undefined ||
    anchorDOM === null ||
    focusDOM === null
  )
    return null;

  if (anchorDOM.nodeName === "BR")
    [anchorDOM, anchorOffset] = getDOMIndexWithinParent(
      anchorDOM as ChildNode
    );
  if (focusDOM.nodeName === "BR")
    [focusDOM, focusOffset] = getDOMIndexWithinParent(focusDOM as ChildNode);

  const firstChild = anchorDOM.firstChild;
  if (
    anchorDOM === focusDOM &&
    firstChild !== null &&
    firstChild.nodeName === "BR" &&
    anchorOffset === 0 &&
    focusOffset === 0
  )
    focusOffset = 1;

  try {
    range.setStart(anchorDOM, anchorOffset);
    range.setEnd(focusDOM, focusOffset);
  } catch {
    return null;
  }

  if (
    range.collapsed &&
    (anchorOffset !== focusOffset || anchorKey !== focusKey)
  ) {
    range.setStart(focusDOM, focusOffset);
    range.setEnd(anchorDOM, anchorOffset);
  }
  return range;
}
