// P2-6: lets the user paste a personal access token and verifies it
// against the web app. Generating a token *from* CollabNow account settings
// is P2-8's job (a separate, parallel-capable issue per docs/ROADMAP.md) —
// until that ships, a token is obtained some other way (e.g. directly via
// the web app's auth API) and pasted here. This page is only the
// extension-side half of FR-16's auth flow.

import { useEffect, useState } from "react";
import { getToken, setToken, clearToken } from "../lib/token-storage";
import { verifyToken, type ConnectedAccount } from "../lib/auth-client";
import { Logo } from "../components/logo";
import { Button } from "../components/button";

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
    <div className="flex min-h-screen justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-6 text-lg font-semibold text-foreground">
          Settings
        </h1>

        {account ? (
          <div className="mt-4 rounded-md border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm text-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              Connected as <span className="font-medium">{account.email}</span>
            </p>
            <Button
              variant="outline"
              className="mt-3 w-auto"
              onClick={() => void handleClear()}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-border bg-card p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Paste a personal access token generated from your CollabNow
              account to connect this extension. Tokens authenticate without
              sharing your browser&apos;s sign-in session.
            </p>
            <input
              type="password"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Paste your personal access token"
              className="mt-3 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              className="mt-3"
              onClick={() => void handleSave()}
              disabled={status === "checking" || !tokenInput.trim()}
            >
              {status === "checking" ? "Checking…" : "Save"}
            </Button>
            {status === "error" && (
              <p className="mt-2 text-xs text-destructive">
                That token couldn&apos;t be verified. Check it and try again.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
