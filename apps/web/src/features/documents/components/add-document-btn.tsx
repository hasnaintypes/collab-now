"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createDocument } from "../actions/room.actions";
import { DOCUMENT_TEMPLATES } from "../lib/document-templates";
import type { DocumentTemplateId } from "../lib/document-templates";
import type { AddDocumentBtnProps } from "../types";

/**
 * P4-1: a small set of starter templates alongside the plain "Blank
 * document" option this button used to only offer. Picking either closes
 * the popover and creates the document immediately — there's no separate
 * "confirm" step, matching how creating a blank document already worked
 * before this feature existed.
 */
export default function AddDocumentBtn({ userId, email, workspaceId }: AddDocumentBtnProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (templateId?: DocumentTemplateId) => {
    setOpen(false);
    setLoading(true);
    setError(null);
    try {
      const result = await createDocument({ userId, email, workspaceId, templateId });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/documents/${result.data.id}`);
    } catch (error) {
      console.error(`Failed to create document: ${error}`);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            disabled={loading}
            className="rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating..." : "New Document"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1.5">
          <button
            onClick={() => handleCreate()}
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-muted"
          >
            <FileText className="size-4 text-muted-foreground" />
            Blank document
          </button>
          <div className="my-1 border-t border-border" />
          {Object.values(DOCUMENT_TEMPLATES).map((template) => (
            <button
              key={template.id}
              onClick={() => handleCreate(template.id)}
              className="flex w-full flex-col gap-0.5 rounded-sm px-2.5 py-2 text-left transition-colors hover:bg-muted"
            >
              <span className="text-sm font-medium">{template.label}</span>
              <span className="text-xs text-muted-foreground">
                {template.description}
              </span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
