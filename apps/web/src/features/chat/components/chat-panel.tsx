"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { MessageCircleQuestion, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import UpgradeLink from "@/features/billing/components/upgrade-link";
import { askAboutDocument } from "../actions/chat.actions";

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * P2-5's "Ask about this" chat panel — the client-side half of P2-4's
 * `askAboutDocument` action. Deliberately stateless across reloads: the
 * conversation lives only in this component's own `useState`, matching
 * PRD §6.10 (no chat-history table exists or is planned; each question is
 * answered fresh from `document_chunk`). Rendered by `editor.tsx` as a tab
 * alongside `Comments`, gated by `hasChatSource` — see `document-navbar`'s
 * sibling `editor.tsx` for the gating.
 */
export default function ChatPanel({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  // ChatPanel is conditionally rendered (gated by `hasChatSource &&
  // rightPanelTab === "chat"`), so switching tabs while a question is in
  // flight unmounts this component before `askAboutDocument` resolves.
  // Guard every post-await `setState` with this so a stale response can't
  // touch state after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || submitting) return;

    setError(null);
    setUpgradeRequired(false);
    setSubmitting(true);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");

    const result = await askAboutDocument({ roomId, question: trimmed });
    if (!mountedRef.current) return;
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      setUpgradeRequired(result.upgradeRequired ?? false);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: result.data.answer },
    ]);
  };

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageCircleQuestion className="mb-3 size-8 text-muted-foreground/40" />
          <p className="text-xs font-medium text-muted-foreground">
            Ask about this document
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            Answers come only from this document&apos;s own source material.
          </p>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex flex-col gap-3">
          {messages.map((message, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[90%] rounded-sm border border-border/50 px-3 py-2 text-sm",
                message.role === "user" ? "self-end bg-foreground/5" : "bg-muted/50"
              )}
            >
              {message.content}
            </div>
          ))}
        </div>
      )}

      {submitting && (
        <p className="text-xs text-muted-foreground">Thinking…</p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {upgradeRequired && <UpgradeLink />}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question about this document…"
          disabled={submitting}
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={submitting || !question.trim()}
          aria-label="Send question"
        >
          <SendHorizontal />
        </Button>
      </form>
    </div>
  );
}
