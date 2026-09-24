// P2-6: lets the user paste a personal access token and verifies it
// against the web app. Generating a token *from* CollabNow account settings
// is P2-8's job (a separate, parallel-capable issue per docs/ROADMAP.md) —
// until that ships, a token is obtained some other way (e.g. directly via
// the web app's auth API) and pasted here. This page is only the
// extension-side half of FR-16's auth flow.

import { useEffect, useState } from "react";
import { getToken, setToken, clearToken } from "../lib/token-storage";
import { verifyToken, type ConnectedAccount } from "../lib/auth-client";

export default function Options() {
  const [tokenInput, setTokenInput] = useState("");
  const [account, setAccount] = useState<ConnectedAccount | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");

  useEffect(() => {
    void (async () => {
      const stored = await getToken();
      if (!stored) return;
      setStatus("checking");
      const verified = await verifyToken(stored);
      setAccount(verified);
      setStatus(verified ? "idle" : "error");
    })();
  }, []);

  const handleSave = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) return;

    setStatus("checking");
    const verified = await verifyToken(trimmed);
    if (!verified) {
      setStatus("error");
      setAccount(null);
      return;
    }

    await setToken(trimmed);
    setAccount(verified);
    setTokenInput("");
    setStatus("idle");
  };

  const handleClear = async () => {
    await clearToken();
    setAccount(null);
    setStatus("idle");
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 420 }}>
      <h1 style={{ fontSize: 16, fontWeight: 700 }}>CollabNow — Settings</h1>

      {account ? (
        <>
          <p style={{ fontSize: 13, color: "#1a7f37" }}>
            Connected as <strong>{account.email}</strong>
          </p>
          <button
            onClick={handleClear}
            style={{ marginTop: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
          >
            Disconnect
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "#666" }}>
            Paste a personal access token generated from your CollabNow
            account to connect this extension. Tokens authenticate without
            sharing your browser&apos;s sign-in session.
          </p>
          <input
            type="password"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Paste your personal access token"
            style={{ width: "100%", padding: "6px 8px", fontSize: 13, boxSizing: "border-box" }}
          />
          <button
            onClick={handleSave}
            disabled={status === "checking" || !tokenInput.trim()}
            style={{
              marginTop: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: status === "checking" ? "not-allowed" : "pointer",
            }}
          >
            {status === "checking" ? "Checking…" : "Save"}
          </button>
          {status === "error" && (
            <p style={{ fontSize: 12, color: "#b42318", marginTop: 8 }}>
              That token couldn&apos;t be verified. Check it and try again.
            </p>
          )}
        </>
      )}
    </div>
  );
}
