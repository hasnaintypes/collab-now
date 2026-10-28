// P2-6 detects the active tab's URL/content type and shows whether the
// extension is authenticated. P2-7 wires the "Generate notes" button itself:
// enqueue a job for the current tab, poll it inline, and deep-link into the
// resulting document once it's ready (FR-15, FR-17, PRD §7 Flow A).

import { useEffect, useRef, useState } from "react";
import { getActiveTabInfo, type ActiveTabInfo } from "../lib/tab-detector";
import { getToken } from "../lib/token-storage";
import { verifyToken, type ConnectedAccount } from "../lib/auth-client";
import { generateNotes, getJobStatus, type JobStatusView } from "../lib/job-client";
import { API_BASE_URL } from "../lib/config";
import { Logo } from "../components/logo";
import { Button } from "../components/button";

const SOURCE_TYPE_LABEL: Record<string, string> = {
  youtube: "This is a YouTube video.",
  article: "This looks like an article.",
};

const JOB_STATUS_LABEL: Record<JobStatusView["status"], string> = {
  queued: "Queued — waiting to start…",
  processing: "Processing your source and generating notes…",
  ready: "Notes ready!",
  failed: "Failed",
};

const POLL_INTERVAL_MS = 2000;

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={`size-1.5 rounded-full ${connected ? "bg-success" : "bg-destructive"}`}
    />
  );
}

export default function Popup() {
  const [loading, setLoading] = useState(true);
  const [tabInfo, setTabInfo] = useState<ActiveTabInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<ConnectedAccount | null>(null);

  const [generating, setGenerating] = useState(false);
  const [job, setJob] = useState<JobStatusView | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobUpgradeRequired, setJobUpgradeRequired] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [tab, storedToken] = await Promise.all([
        getActiveTabInfo(),
        getToken(),
      ]);
      if (cancelled) return;
      setTabInfo(tab);
      setToken(storedToken);

      if (storedToken) {
        const verified = await verifyToken(storedToken);
        if (!cancelled) setAccount(verified);
      }
      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Belt-and-suspenders: also clear if the popup closes mid-poll (it
  // unmounts on close, same as the web app's NewFromUrlDialog).
  useEffect(() => stopPolling, []);

  const pollJobStatus = (authToken: string, jobId: string) => {
    pollRef.current = setInterval(async () => {
      const result = await getJobStatus(authToken, jobId);

      if (!result.success) {
        stopPolling();
        setJobError(result.error);
        return;
      }

      setJob(result.data);

      if (result.data.status === "ready" || result.data.status === "failed") {
        stopPolling();
        if (result.data.status === "failed") {
          setJobError(
            result.data.errorMessage ?? "This job failed. Please try again."
          );
        }
      }
    }, POLL_INTERVAL_MS);
  };

  const handleGenerate = async () => {
    if (!token || !tabInfo?.url || !tabInfo.sourceType) return;

    setJobError(null);
    setJobUpgradeRequired(false);
    setGenerating(true);

    const result = await generateNotes(token, tabInfo.url);

    setGenerating(false);

    if (!result.success) {
      setJobError(result.error);
      setJobUpgradeRequired(result.upgradeRequired ?? false);
      return;
    }

    setJob({
      id: result.data.jobId,
      status: "queued",
      sourceType: tabInfo.sourceType,
      sourceUrl: tabInfo.url,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      roomId: null,
    });
    pollJobStatus(token, result.data.jobId);
  };

  const openDocument = () => {
    if (!job?.roomId) return;
    void chrome.tabs.create({ url: `${API_BASE_URL}/documents/${job.roomId}` });
  };

  // P3-5 / PRD §7 Flow D: there's no Paddle checkout UI in the extension
  // itself — it lives in the web app's Settings billing section (P3-2) —
  // so the upgrade link just deep-links there in a new tab rather than
  // duplicating that flow here.
  const openBillingSettings = () => {
    void chrome.tabs.create({ url: `${API_BASE_URL}/settings` });
  };

  const retry = () => {
    stopPolling();
    setJob(null);
    setJobError(null);
    setJobUpgradeRequired(false);
  };

  const isSupportedPage = tabInfo?.sourceType != null;
  const canGenerate = isSupportedPage && account !== null;
  const isBusy = generating || job?.status === "queued" || job?.status === "processing";

  return (
    <div className="w-[300px] bg-background p-4 text-foreground">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <StatusDot connected={account !== null} />
          {account ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="mt-3.5 rounded-md border border-border bg-card px-3 py-2.5">
        {loading ? (
          <p className="text-xs text-muted-foreground">Checking this page…</p>
        ) : (
          <p className="text-xs leading-relaxed text-foreground">
            {tabInfo === null
              ? "Couldn't read this tab's URL."
              : isSupportedPage
                ? SOURCE_TYPE_LABEL[tabInfo.sourceType as string]
                : "This page isn't a YouTube video or article CollabNow can turn into notes."}
          </p>
        )}
      </div>

      {!account && !loading && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Add a personal access token in Settings to connect this extension.
        </p>
      )}

      <div className="mt-3.5 flex flex-col gap-2">
        {job?.status !== "ready" && (
          <Button
            onClick={() => void handleGenerate()}
            disabled={!canGenerate || isBusy}
            title={
              canGenerate
                ? undefined
                : "Requires a supported page and a connected personal access token"
            }
          >
            {generating ? "Submitting…" : "Generate notes"}
          </Button>
        )}

        {job && (
          <p className="text-xs text-muted-foreground">
            {JOB_STATUS_LABEL[job.status]}
          </p>
        )}

        {jobError && (
          <p className="text-xs text-destructive">{jobError}</p>
        )}

        {jobUpgradeRequired && (
          <Button variant="outline" onClick={openBillingSettings}>
            Upgrade plan
          </Button>
        )}

        {job?.status === "ready" && job.roomId && (
          <Button onClick={openDocument}>Open document</Button>
        )}

        {(job?.status === "failed" || jobError) && (
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        )}

        {!account && (
          <Button
            variant="outline"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            Open Settings
          </Button>
        )}
      </div>
    </div>
  );
}
