"use client";

import { useState } from "react";
import { createDocument } from "../actions/room.actions";
import { useRouter } from "next/navigation";
import type { AddDocumentBtnProps } from "../types";

export default function AddDocumentBtn({ userId, email, workspaceId }: AddDocumentBtnProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await createDocument({ userId, email, workspaceId });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/documents/${result.room.id}`);
    } catch (error) {
      console.error(`Failed to create document: ${error}`);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        onClick={handleAdd}
        disabled={loading}
        className="rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating..." : "New Document"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
