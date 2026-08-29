"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Star,
  Archive,
  ArchiveRestore,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, dateConverter } from "@/lib/utils";
import {
  toggleStarDocument,
  toggleArchiveDocument,
  getDocumentsForUser,
} from "../actions/room.actions";
import { Button } from "@/components/ui/button";
import AddDocumentBtn from "./add-document-btn";
import DeleteDocumentDialog from "./delete-document-dialog";
import DashboardShareDialog from "./dashboard-share-dialog";
import type { DocumentFilter, RoomDocument } from "../types";

const SEARCH_DEBOUNCE_MS = 300;
// Search always queries the full backing set (bounded by the 50-doc/user cap),
// not just the currently loaded page, so results never regress relative to the
// old client-side "search everything" behavior.
const SEARCH_RESULT_LIMIT = 50;

export default function DocumentsSection({
  documents,
  nextCursor,
  userId,
  email,
  workspaceId,
  activeFilter,
  currentUser,
}: {
  documents: RoomDocument[];
  nextCursor: string | null;
  userId: string;
  email: string;
  workspaceId: string;
  activeFilter: DocumentFilter;
  currentUser: { name: string; email: string; avatar: string };
}) {
  // `activeFilter` is passed as this component's React `key` from the parent
  // (switching filter tabs is a new server render), so a fresh mount — and
  // fresh initial state below — is all that's needed to pick up the new page;
  // no reset-on-prop-change effect required.
  const [items, setItems] = useState<RoomDocument[]>(documents);
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RoomDocument[] | null>(null);
  const [isLoadingMore, startLoadMoreTransition] = useTransition();
  const [isSearching, startSearchTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Search queries the server for the full matching set instead of filtering
  // only the currently-loaded page.
  useEffect(() => {
    startSearchTransition(async () => {
      if (!debouncedQuery) {
        setSearchResults(null);
        return;
      }
      const result = await getDocumentsForUser(userId, {
        filter: activeFilter,
        search: debouncedQuery,
        limit: SEARCH_RESULT_LIMIT,
      });
      setSearchResults(result.success ? result.data.documents : []);
    });
  }, [debouncedQuery, activeFilter, userId]);

  const applyToggle = (
    list: RoomDocument[],
    roomId: string,
    key: "isStarred" | "isArchived"
  ) =>
    list.map((d) => (d.id === roomId ? { ...d, [key]: !d[key] } : d));

  const handleToggleStar = async (roomId: string) => {
    setItems((prev) => applyToggle(prev, roomId, "isStarred"));
    setSearchResults((prev) => (prev ? applyToggle(prev, roomId, "isStarred") : prev));
    const result = await toggleStarDocument(roomId, userId);
    if (!result.success) {
      // Revert on error
      setItems((prev) => applyToggle(prev, roomId, "isStarred"));
      setSearchResults((prev) => (prev ? applyToggle(prev, roomId, "isStarred") : prev));
    }
  };

  const handleToggleArchive = async (roomId: string) => {
    setItems((prev) => applyToggle(prev, roomId, "isArchived"));
    setSearchResults((prev) => (prev ? applyToggle(prev, roomId, "isArchived") : prev));
    const result = await toggleArchiveDocument(roomId, userId);
    if (!result.success) {
      setItems((prev) => applyToggle(prev, roomId, "isArchived"));
      setSearchResults((prev) => (prev ? applyToggle(prev, roomId, "isArchived") : prev));
    }
  };

  const handleLoadMore = () => {
    if (!cursor || isLoadingMore) return;
    startLoadMoreTransition(async () => {
      const result = await getDocumentsForUser(userId, {
        filter: activeFilter,
        cursor,
      });
      if (!result.success) return;
      setItems((prev) => [...prev, ...result.data.documents]);
      setCursor(result.data.nextCursor);
    });
  };

  const displayed = searchResults ?? items;

  const filterLabels: Record<string, string> = {
    recent: "Recent Documents",
    starred: "Starred Documents",
    shared: "Shared with Me",
    archived: "Archived Documents",
    all: "All Documents",
  };

  const sectionLabel = debouncedQuery
    ? `${displayed.length} result${displayed.length !== 1 ? "s" : ""}`
    : filterLabels[activeFilter] || "All Documents";

  // No documents at all (not a search result)
  if (items.length === 0 && !debouncedQuery) {
    return (
      <section>
        <div className="mb-8 px-2">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {filterLabels[activeFilter] || "All Documents"}
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border/50 py-24 text-center">
          <div className="mb-5 flex size-16 items-center justify-center rounded-sm bg-muted">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-bold tracking-tight">
            {activeFilter === "starred"
              ? "No starred documents"
              : activeFilter === "shared"
                ? "No shared documents"
                : activeFilter === "archived"
                  ? "No archived documents"
                  : "No documents yet"}
          </h2>
          <p className="mb-8 max-w-sm text-sm text-muted-foreground">
            {activeFilter === "starred"
              ? "Star documents to quickly find them later."
              : activeFilter === "shared"
                ? "Documents shared with you by others will appear here."
                : activeFilter === "archived"
                  ? "Archived documents will appear here."
                  : "Create your first document to start collaborating with your team."}
          </p>
          {!["starred", "shared", "archived"].includes(activeFilter) && (
            <AddDocumentBtn userId={userId} email={email} workspaceId={workspaceId} />
          )}
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
      {debouncedQuery && displayed.length === 0 && !isSearching ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border/50 py-24 text-center">
          <Search className="mb-4 size-10 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-bold tracking-tight">No results</h3>
          <p className="text-sm text-muted-foreground">
            No documents match &ldquo;{debouncedQuery}&rdquo;
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayed.map(({ id, metadata, createdAt, isStarred, isArchived }) => (
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
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleToggleStar(id)}
                      title={isStarred ? "Unstar" : "Star"}
                    >
                      <Star
                        className={cn(
                          "size-4",
                          isStarred
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-muted-foreground"
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleToggleArchive(id)}
                      title={isArchived ? "Unarchive" : "Archive"}
                    >
                      {isArchived ? (
                        <ArchiveRestore className="size-4 text-muted-foreground" />
                      ) : (
                        <Archive className="size-4 text-muted-foreground" />
                      )}
                    </Button>
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

          {!debouncedQuery && cursor && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
