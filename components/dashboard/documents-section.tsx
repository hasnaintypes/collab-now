"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { dateConverter } from "@/lib/utils";
import AddDocumentBtn from "./add-document-btn";
import DeleteDocumentDialog from "./delete-document-dialog";
import DashboardShareDialog from "./dashboard-share-dialog";

export default function DocumentsSection({
  documents,
  userId,
  email,
  workspaceId,
  activeFilter,
  currentUser,
}: {
  documents: RoomDocument[];
  userId: string;
  email: string;
  workspaceId: string;
  activeFilter: string;
  currentUser: { name: string; email: string; avatar: string };
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full pl-9 sm:w-56"
          />
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
      ) : (
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
                  <DashboardShareDialog
                    roomId={id}
                    creatorId={metadata.creatorId || userId}
                    currentUser={currentUser}
                  />
                  <DeleteDocumentDialog roomId={id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
