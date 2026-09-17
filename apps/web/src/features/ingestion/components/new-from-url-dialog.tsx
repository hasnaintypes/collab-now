"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  enqueueIngestionJob,
  getIngestionJobStatus,
} from "../actions/ingestion.actions";
import type { IngestionJobStatus } from "../types";

/**
 * "New from URL" entry point (P1-8 / PRD §7 Flow B). Submits a YouTube or
 * article URL via `enqueueIngestionJob` (FR-7: caller gets a job id back
 * immediately) and polls `getIngestionJobStatus` — there's no existing
 * realtime/subscription mechanism for this in the codebase (Liveblocks'
 * hooks are room-scoped, not applicable to an `ingestion_job` row), so this
 * is a plain `setInterval` poll, stopped on unmount/dialog-close/terminal
 * status. Navigates into the resulting document automatically once the job
 * reaches "ready".
 */

const POLL_INTERVAL_MS = 2000;

export default function NewFromUrlDialog({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<IngestionJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Belt-and-suspenders: also clear on unmount, in case the dialog is
  // still open when the user navigates away some other way.
  useEffect(() => stopPolling, []);

  const resetState = () => {
    stopPolling();
    setSourceUrl("");
    setSubmitting(false);
    setJobId(null);
    setStatus(null);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetState();
  };

  const pollStatus = (id: string) => {
    pollRef.current = setInterval(async () => {
      const result = await getIngestionJobStatus({ jobId: id });

      if (!result.success) {
        stopPolling();
        setError(result.error);
        return;
      }

      setStatus(result.data.status);

      if (result.data.status === "ready") {
        stopPolling();
        if (result.data.roomId) {
          router.push(`/documents/${result.data.roomId}`);
        }
        return;
      }

      if (result.data.status === "failed") {
        stopPolling();
        setError(
          result.data.errorMessage ?? "This job failed. Please try again."
        );
      }
    }, POLL_INTERVAL_MS);
  };

  const handleSubmit = async () => {
    if (!sourceUrl.trim()) {
      setError("Paste a YouTube or article URL first.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const result = await enqueueIngestionJob({
      workspaceId,
      sourceUrl: sourceUrl.trim(),
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setJobId(result.data.jobId);
    setStatus("queued");
    pollStatus(result.data.jobId);
  };

  const isBusy = submitting || status === "queued" || status === "processing";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="rounded-sm border border-border px-5 py-2 text-sm font-semibold transition-colors hover:bg-muted">
          New from URL
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate notes from a URL</DialogTitle>
          <DialogDescription>
            Paste a YouTube video or article link — we&apos;ll turn it into a
            bullet/outline notes document.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              disabled={isBusy}
              className="flex-1"
            />
          </div>

          {!jobId && (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Submitting..." : "Generate notes"}
            </Button>
          )}

          {status && status !== "failed" && (
            <p className="text-sm text-muted-foreground">
              {status === "queued" && "Queued — waiting to start..."}
              {status === "processing" &&
                "Processing your source and generating notes..."}
              {status === "ready" && "Done! Opening your document..."}
            </p>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {status === "failed" && (
            <Button variant="outline" onClick={resetState} className="w-full">
              Try again
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
