"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Mail, Clock } from "lucide-react";
import {
  searchUsers,
  inviteMember,
  getPendingInvites,
} from "@/lib/actions/workspace.actions";
import { dateConverter } from "@/lib/utils";

type SearchResult = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function InviteMemberDialog({
  workspaceId,
  invitedById,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      getPendingInvites(workspaceId).then(setPendingInvites);
    }
  }, [open, workspaceId]);

  const handleSearch = (value: string) => {
    setEmail(value);
    setMessage(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const users = await searchUsers({ query: value, workspaceId });
      setResults(users || []);
      setShowResults(true);
    }, 300);
  };

  const selectUser = (u: SearchResult) => {
    setEmail(u.email);
    setShowResults(false);
  };

  const handleInvite = async () => {
    if (!email) return;
    setLoading(true);
    setMessage(null);

    try {
      const result = await inviteMember({
        workspaceId,
        email,
        role,
        invitedById,
      });

      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `Invite sent to ${email}` });
        setEmail("");
        // Refresh pending invites
        const invites = await getPendingInvites(workspaceId);
        setPendingInvites(invites);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to send invite" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50">
          <UserPlus className="size-5" strokeWidth={1.5} />
          <span>Invite Member</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Invite someone to your workspace by email.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="invite-email">Email address</Label>
            <div className="relative mt-1.5">
              <div className="flex items-center gap-2">
                <Input
                  id="invite-email"
                  placeholder="Search by name or email"
                  value={email}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)}
                  className="flex-1"
                />
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-28" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search results dropdown */}
              {showResults && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                  {results.map((u) => (
                    <button
                      key={u.id}
                      onMouseDown={() => selectUser(u)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase">
                        {u.name?.charAt(0) || u.email.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleInvite}
            disabled={loading || !email}
            className="w-full"
            size="sm"
          >
            <Mail className="mr-2 size-4" />
            {loading ? "Sending..." : "Send Invite"}
          </Button>

          {message && (
            <p
              className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-500"}`}
            >
              {message.text}
            </p>
          )}
        </div>

        {pendingInvites.length > 0 && (
          <>
            <Separator className="my-2" />
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Pending Invites
              </h4>
              <ul className="space-y-2">
                {pendingInvites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="size-3.5 text-muted-foreground" />
                      <span className="truncate">{invite.email}</span>
                    </div>
                    <span className="text-xs capitalize text-muted-foreground">
                      {invite.role}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
