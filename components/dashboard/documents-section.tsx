"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FileText, Search, LayoutGrid, List, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { dateConverter } from "@/lib/utils";
import AddDocumentBtn from "./add-document-btn";
import DeleteDocumentDialog from "./delete-document-dialog";

export default function DocumentsSection({
  documents,
  userId,
  email,
  workspaceId,
  activeFilter,
}: {
  documents: RoomDocument[];
  userId: string;
  email: string;
  workspaceId: string;
  activeFilter: string;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load view preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("collab-dashboard-view");
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  // Persist view preference
  useEffect(() => {
    localStorage.setItem("collab-dashboard-view", view);
  }, [view]);

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const filtered = documents.filter((doc) =>
    doc.metadata.title.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  const sectionLabel =
    debouncedQuery
      ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`
      : activeFilter === "recent"
        ? "Recent Documents"
        : "All Documents";

  // No documents at all (not a search result)
  if (documents.length === 0) {
    return (
      <section>
        <div className="mb-8 px-2">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {activeFilter === "recent" ? "Recent Documents" : "All Documents"}
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border/50 py-24 text-center">
          <div className="mb-5 flex size-16 items-center justify-center rounded-sm bg-muted">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-bold tracking-tight">
            No documents yet
          </h2>
          <p className="mb-8 max-w-sm text-sm text-muted-foreground">
            Create your first document to start collaborating with your team.
          </p>
          <AddDocumentBtn userId={userId} email={email} workspaceId={workspaceId} />
        </div>
      </section>
    );
  }

  return (
    <section>
      {/* Section header with search + view toggle */}
      <div className="mb-8 flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {sectionLabel}
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full pl-9 sm:w-56"
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setView("grid")}
              className={view === "grid" ? "text-foreground" : "text-muted-foreground"}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setView("list")}
              className={view === "list" ? "text-foreground" : "text-muted-foreground"}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search returned no results */}
      {filtered.length === 0 && debouncedQuery ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border/50 py-24 text-center">
          <Search className="mb-4 size-10 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-bold tracking-tight">No results</h3>
          <p className="text-sm text-muted-foreground">
            No documents match &ldquo;{debouncedQuery}&rdquo;
          </p>
        </div>
      ) : view === "list" ? (
        /* List view */
        <div className="space-y-3">
          {filtered.map(({ id, metadata, createdAt }) => (
            <div
              key={id}
              className="group flex items-center justify-between rounded-sm bg-muted/40 p-5 transition-all duration-300 hover:bg-card hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
            >
              <Link
                href={`/documents/${id}`}
                className="flex flex-1 items-center gap-5"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-muted">
                  <FileText className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="text-base font-bold tracking-tight">
                    {metadata.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Created {dateConverter(createdAt)}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Link
                    href={`/documents/${id}`}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Share2 className="size-[18px]" />
                  </Link>
                  <DeleteDocumentDialog roomId={id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ id, metadata, createdAt }) => (
            <Card
              key={id}
              className="group relative flex flex-col gap-0 overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
            >
              <Link
                href={`/documents/${id}`}
                className="flex flex-1 flex-col p-5"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-sm bg-muted">
                  <FileText className="size-5 text-muted-foreground" />
                </div>
                <h4 className="mb-1 text-base font-bold tracking-tight line-clamp-2">
                  {metadata.title}
                </h4>
                <p className="mt-auto text-xs text-muted-foreground">
                  Created {dateConverter(createdAt)}
                </p>
              </Link>
              <div className="flex items-center justify-end gap-1 border-t px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Link
                  href={`/documents/${id}`}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Share2 className="size-4" />
                </Link>
                <DeleteDocumentDialog roomId={id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
