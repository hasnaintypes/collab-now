// P2-6: detects the active tab's URL/content type and shows whether the
// extension is authenticated. "Generate notes" (P2-7, FR-15/17) isn't wired
// yet — this popup only proves detection + auth, this issue's own scope.

import { useEffect, useState } from "react";
import { getActiveTabInfo, type ActiveTabInfo } from "../lib/tab-detector";
import { getToken } from "../lib/token-storage";
import { verifyToken, type ConnectedAccount } from "../lib/auth-client";

const SOURCE_TYPE_LABEL: Record<string, string> = {
  youtube: "This is a YouTube video.",
  article: "This looks like an article.",
};

export default function Popup() {
  const [loading, setLoading] = useState(true);
  const [tabInfo, setTabInfo] = useState<ActiveTabInfo | null>(null);
  const [account, setAccount] = useState<ConnectedAccount | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [tab, token] = await Promise.all([
        getActiveTabInfo(),
        getToken(),
      ]);
      if (cancelled) return;
      setTabInfo(tab);

      if (token) {
        const verified = await verifyToken(token);
        if (!cancelled) setAccount(verified);
      }
      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isSupportedPage = tabInfo?.sourceType != null;
  const canGenerate = isSupportedPage && account !== null;

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
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

      <button
        disabled
        title={
          canGenerate
            ? "Coming soon"
            : "Requires a supported page and a connected personal access token"
        }
        style={{
          marginTop: 12,
          width: "100%",
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "not-allowed",
          opacity: 0.5,
        }}
      >
        Generate notes (coming soon)
      </button>

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
