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

export default function Popup() {
  const [loading, setLoading] = useState(true);
  const [tabInfo, setTabInfo] = useState<ActiveTabInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<ConnectedAccount | null>(null);

  const [generating, setGenerating] = useState(false);
  const [job, setJob] = useState<JobStatusView | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
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
    setGenerating(true);

    const result = await generateNotes(token, tabInfo.url);

    setGenerating(false);

    if (!result.success) {
      setJobError(result.error);
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

  const retry = () => {
    stopPolling();
    setJob(null);
    setJobError(null);
  };

  const isSupportedPage = tabInfo?.sourceType != null;
  const canGenerate = isSupportedPage && account !== null;
  const isBusy = generating || job?.status === "queued" || job?.status === "processing";

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif", width: 260 }}>
      <h1 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>CollabNow</h1>

      {loading ? (
        <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>Checking this page…</p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
            {tabInfo === null
              ? "Couldn't read this tab's URL."
              : isSupportedPage
                ? SOURCE_TYPE_LABEL[tabInfo.sourceType as string]
                : "This page isn't a YouTube video or article CollabNow can turn into notes."}
          </p>

          <p style={{ fontSize: 12, color: account ? "#1a7f37" : "#b42318", marginTop: 4 }}>
            {account ? `Connected as ${account.email}` : "Not connected — add a personal access token in Settings."}
          </p>
        </>
      )}

      {job?.status !== "ready" && (
        <button
          onClick={() => void handleGenerate()}
          disabled={!canGenerate || isBusy}
          title={
            canGenerate
              ? undefined
              : "Requires a supported page and a connected personal access token"
          }
          style={{
            marginTop: 12,
            width: "100%",
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: !canGenerate || isBusy ? "not-allowed" : "pointer",
            opacity: !canGenerate || isBusy ? 0.5 : 1,
          }}
        >
          {generating ? "Submitting…" : "Generate notes"}
        </button>
      )}

      {job && (
        <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
          {JOB_STATUS_LABEL[job.status]}
        </p>
      )}

      {jobError && (
        <p style={{ fontSize: 12, color: "#b42318", marginTop: 4 }}>{jobError}</p>
      )}

      {job?.status === "ready" && job.roomId && (
        <button
          onClick={openDocument}
          style={{
            marginTop: 8,
            width: "100%",
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Open document
        </button>
      )}

      {(job?.status === "failed" || jobError) && (
        <button
          onClick={retry}
          style={{
            marginTop: 8,
            width: "100%",
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      )}

      {!account && (
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          style={{
            marginTop: 8,
            width: "100%",
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Open Settings
        </button>
      )}
    </div>
  );
}
