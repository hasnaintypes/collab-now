"use client";

import { useRef, useState, useEffect } from "react";
import { Pencil, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { updateDocument } from "@/lib/actions/room.actions";
import { cn } from "@/lib/utils";
import type { HeadingEntry } from "@/components/editor/plugins/heading-outline-plugin";

type SidebarProps = {
  roomId: string;
  title: string;
  currentUserType: UserType;
  currentUserName: string;
  headings: HeadingEntry[];
  activeHeadingKey: string | null;
  onScrollToHeading: (key: string) => void;
};

export function DocumentSidebarContent(props: SidebarProps) {
  return <SidebarInner {...props} />;
}

export default function DocumentSidebar(props: SidebarProps) {
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 flex-col py-6 bg-muted/50 border-r border-border/50 hidden lg:flex overflow-y-auto no-scrollbar">
      <SidebarInner {...props} />
    </aside>
  );
}

function SidebarInner({
  roomId,
  title,
  currentUserType,
  currentUserName,
  headings,
  activeHeadingKey,
  onScrollToHeading,
}: SidebarProps) {
  const [documentTitle, setDocumentTitle] = useState(title);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [outlineVisible, setOutlineVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTitleKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      setLoading(true);
      try {
        if (documentTitle !== title) {
          const updated = await updateDocument(roomId, documentTitle);
          if (updated) setEditing(false);
        }
      } catch (error) {
        console.error(`Failed to update title: ${error}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setEditing(false);
        updateDocument(roomId, documentTitle);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [roomId, documentTitle]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  return (
    <>
      {/* Document Title */}
      <div className="px-5 mb-6">
        <div ref={containerRef} className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground text-xs font-bold rounded-sm">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            {editing && !loading ? (
              <Input
                type="text"
                value={documentTitle}
                ref={inputRef}
                placeholder="Enter title"
                onChange={(e) => setDocumentTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                className="h-7 w-full border-border/50 text-xs font-bold"
              />
            ) : (
              <button
                onClick={() =>
                  currentUserType === "editor" && setEditing(true)
                }
                className="group flex items-center gap-1 w-full text-left"
              >
                <p className="text-sm font-bold truncate tracking-tight">
                  {documentTitle}
                </p>
                {currentUserType === "editor" && (
                  <Pencil className="size-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </button>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {currentUserName}
            </p>
            {loading && (
              <span className="text-[10px] text-muted-foreground">
                saving...
              </span>
            )}
            {currentUserType !== "editor" && (
              <span className="inline-block mt-1 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                View only
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-border/50 mx-4 mb-4" />

      {/* Document Outline */}
      {outlineVisible && (
        <div className="flex-1 px-3">
          <div className="flex items-center justify-between px-2 mb-3">
            <h3 className="text-[11px] font-semibold text-muted-foreground">
              Outline
            </h3>
            <button
              onClick={() => setOutlineVisible(false)}
              className="p-0.5 rounded hover:bg-muted transition-colors"
            >
              <X className="size-3 text-muted-foreground" />
            </button>
          </div>

          {headings.length === 0 ? (
            <p className="px-2 py-6 text-xs text-muted-foreground text-center leading-relaxed">
              Add headings to your document to see an outline here.
            </p>
          ) : (
            <nav className="flex flex-col gap-0.5">
              {headings.map((h) => (
                <button
                  key={h.key}
                  onClick={() => onScrollToHeading(h.key)}
                  className={cn(
                    "w-full text-left py-1.5 rounded-md text-[13px] leading-snug truncate transition-colors hover:bg-muted",
                    h.tag === "h1" && "px-2 font-medium",
                    h.tag === "h2" && "pl-5 pr-2",
                    (h.tag === "h3" ||
                      h.tag === "h4" ||
                      h.tag === "h5" ||
                      h.tag === "h6") &&
                      "pl-8 pr-2 text-[12px]",
                    activeHeadingKey === h.key
                      ? "text-primary bg-primary/5 border-l-2 border-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {h.text}
                </button>
              ))}
            </nav>
          )}
        </div>
      )}

      {!outlineVisible && (
        <div className="px-5">
          <button
            onClick={() => setOutlineVisible(true)}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Show outline
          </button>
        </div>
      )}
    </>
  );
}
