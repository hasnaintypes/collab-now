"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

const TOAST_VISIBLE_MS = 1500;

/**
 * P4-2's Cmd/Ctrl+S shortcut. This editor has no explicit "save" action to
 * trigger — every keystroke already syncs through Liveblocks' Yjs binding
 * in real time (`document-footer.tsx`'s "All changes saved" indicator
 * reflects that continuously, not just on this shortcut). So Cmd/Ctrl+S
 * can't *do* anything a keystroke hasn't already done; what it needs to do
 * is suppress the browser's native save-page dialog and confirm to the
 * user that their content is already saved, per the acceptance criteria's
 * "confirms autosave state" alternative to an explicit save action.
 *
 * Mounted once in `(root)/layout.tsx` alongside `CommandPalette` so the
 * shortcut works everywhere, not just inside the editor.
 */
export default function SaveShortcutToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setVisible(true);
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => setVisible(false), TOAST_VISIBLE_MS);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-sm border border-border bg-background px-3.5 py-2 text-sm shadow-md"
    >
      <Check className="size-4 text-green-500" />
      All changes saved
    </div>
  );
}
