"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import type { RegenerateFunctions } from "@/features/editor/components/plugins/regenerate-notes-plugin";
import { regenerateNotes } from "../actions/ingestion.actions";
import { NOTE_STYLE_LABELS } from "../lib/notes-generator";
import type { NoteStyle } from "../types";

/**
 * P2-2's UI: only rendered by `DocumentNavbar` when the document has
 * `source_content` (i.e. was generated from a URL, per the acceptance
 * criteria's "without touching non-generated documents"). Picking a
 * *different* style doesn't regenerate immediately — it's a destructive
 * operation (replaces the document's current content, possibly
 * user-edited), so it's gated behind `ConfirmDialog` the same way every
 * other hard-to-undo action in this app is (P0-9).
 *
 * `regenerateNotes` never re-fetches or re-extracts anything (FR-9) — it
 * only reads this document's already-stored source text. Once it
 * succeeds, `regenerateRef` (bridged from `RegenerateBridge`, mounted
 * inside the Lexical editor this picker itself has no direct access to)
 * is used to actually replace the editor's content; that update then
 * syncs to every connected client the same way ordinary typing does.
 */
export default function NoteStylePicker({
  roomId,
  initialStyle,
  regenerateRef,
}: {
  roomId: string;
  initialStyle: NoteStyle;
  regenerateRef: React.MutableRefObject<RegenerateFunctions | null>;
}) {
  const [currentStyle, setCurrentStyle] = useState<NoteStyle>(initialStyle);
  const [pendingStyle, setPendingStyle] = useState<NoteStyle | null>(null);

  return (
    <>
      <Select
        value={currentStyle}
        onValueChange={(style: NoteStyle) => {
          if (style !== currentStyle) setPendingStyle(style);
        }}
      >
        <SelectTrigger className="h-8 w-auto text-xs" title="Notes style">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(NOTE_STYLE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ConfirmDialog
        open={pendingStyle !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStyle(null);
        }}
        title="Regenerate notes?"
        description={
          pendingStyle
            ? `This replaces the document's current content with new notes generated in the "${NOTE_STYLE_LABELS[pendingStyle]}" style. This can't be undone.`
            : ""
        }
        confirmLabel="Regenerate"
        loadingLabel="Regenerating..."
        onConfirm={async () => {
          if (!pendingStyle) {
            return { success: false, error: "No style selected." };
          }

          const result = await regenerateNotes({ roomId, style: pendingStyle });
          if (result.success) {
            regenerateRef.current?.replaceContent(result.data.notes);
            setCurrentStyle(pendingStyle);
          }
          return result;
        }}
      />
    </>
  );
}
