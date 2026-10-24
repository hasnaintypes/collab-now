"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { dateConverter } from "@/lib/utils";
import {
  createPersonalAccessToken,
  revokePersonalAccessToken,
  type PersonalAccessToken,
} from "../actions/token.actions";

/**
 * Settings page section for P2-8 / PRD FR-16: generate/revoke the personal
 * access tokens the browser extension authenticates with. The raw token is
 * shown exactly once, right after creation — `listPersonalAccessTokens`
 * (the initial `tokens` prop, and the list this component renders
 * afterward) never includes it, same as a GitHub PAT.
 */
export default function PersonalAccessTokensSection({
  tokens,
}: {
  tokens: PersonalAccessToken[];
}) {
  const [items, setItems] = useState(tokens);

  // Keep in sync if the parent re-renders with a fresh `tokens` prop without
  // remounting this component (e.g. a future router.refresh() on this page).
  useEffect(() => {
    setItems(tokens);
  }, [tokens]);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetCreateState = () => {
    setName("");
    setCreating(false);
    setCreateError(null);
    setCreatedToken(null);
    setCopied(false);
  };

  const handleOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) resetCreateState();
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);

    const result = await createPersonalAccessToken({ name });
    setCreating(false);

    if (!result.success) {
      setCreateError(result.error);
      return;
    }

    setCreatedToken(result.data.token);
    setItems((prev) => [
      {
        id: result.data.id,
        name: name.trim(),
        start: null,
        enabled: true,
        createdAt: new Date().toISOString(),
        lastRequest: null,
        expiresAt: null,
      },
      ...prev,
    ]);
  };

  const handleCopy = async () => {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (tokenId: string) => {
    const result = await revokePersonalAccessToken({ tokenId });
    if (result.success) {
      setItems((prev) => prev.filter((t) => t.id !== tokenId));
    }
    return result;
  };

  return (
    <div className="rounded-sm bg-muted/40">
      <div className="flex items-center justify-between px-6 pt-5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Personal access tokens
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Used by the browser extension to authenticate as you, instead of a
            shared browser session.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              New token
            </Button>
          </DialogTrigger>
          <DialogContent>
            {createdToken ? (
              <>
                <DialogHeader>
                  <DialogTitle>Copy your token now</DialogTitle>
                  <DialogDescription>
                    This is the only time you&apos;ll see this token. Paste it
                    into the CollabNow extension&apos;s settings to connect it.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-2 rounded-sm border border-border bg-muted/60 px-3 py-2">
                  <code className="flex-1 truncate text-xs">{createdToken}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void handleCopy()}
                    aria-label="Copy token"
                  >
                    {copied ? <Check className="text-green-600" /> : <Copy />}
                  </Button>
                </div>
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button>Done</Button>
                  </DialogClose>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Create a personal access token</DialogTitle>
                  <DialogDescription>
                    Give it a name so you can tell it apart from your other
                    tokens later — e.g. &ldquo;Work laptop&rdquo;.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                  <Label htmlFor="pat-name">Name</Label>
                  <Input
                    id="pat-name"
                    placeholder="Work laptop"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={creating}
                  />
                </div>
                {createError && (
                  <p className="text-sm text-red-500">{createError}</p>
                )}
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button variant="outline" disabled={creating}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={() => void handleCreate()}
                    disabled={creating || !name.trim()}
                  >
                    {creating ? "Generating..." : "Generate token"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <KeyRound className="size-6 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            No personal access tokens yet.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/50 px-6">
          {items.map((token) => (
            <li
              key={token.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{token.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Created {dateConverter(token.createdAt)} &middot;{" "}
                  {token.lastRequest
                    ? `Last used ${dateConverter(token.lastRequest)}`
                    : "Never used"}
                </p>
              </div>

              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="xs"
                    className="shrink-0 text-destructive hover:text-destructive"
                  >
                    Revoke
                  </Button>
                }
                title="Revoke token"
                description={`Revoke "${token.name}"? Anything using it (e.g. the browser extension) will stop authenticating immediately. This cannot be undone.`}
                confirmLabel="Revoke"
                loadingLabel="Revoking..."
                onConfirm={() => handleRevoke(token.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
