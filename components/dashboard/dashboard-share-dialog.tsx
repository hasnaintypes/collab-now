"use client";

import { useState, useEffect } from "react";
import { Share2 } from "lucide-react";
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
import UserTypeSelect from "@/components/document/user-type-select";
import CollaboratorRow from "@/components/document/collaborator-row";
import {
  updateDocumentAccess,
  getDocumentCollaborators,
} from "@/lib/actions/room.actions";

export default function DashboardShareDialog({
  roomId,
  creatorId,
  currentUser,
}: {
  roomId: string;
  creatorId: string;
  currentUser: { name: string; email: string; avatar: string };
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<UserType>("viewer");
  const [error, setError] = useState("");
  const [collaborators, setCollaborators] = useState<User[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    getDocumentCollaborators(roomId).then((users) => {
      setCollaborators(users);
      setFetching(false);
    });
  }, [open, roomId]);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleShare = async () => {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setLoading(true);
    await updateDocumentAccess({
      roomId,
      email,
      userType,
      updatedBy: {
        id: currentUser.email,
        name: currentUser.name,
        email: currentUser.email,
        avatar: currentUser.avatar,
        color: "",
      },
    });
    setEmail("");
    setLoading(false);
    // Refresh collaborators
    const updated = await getDocumentCollaborators(roomId);
    setCollaborators(updated);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground">
          <Share2 className="size-[18px]" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Manage who can view and edit this document.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <Label htmlFor="dashboard-share-email">Email address</Label>
          <div className="flex items-center gap-2">
            <Input
              id="dashboard-share-email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <UserTypeSelect userType={userType} setUserType={setUserType} />
            <Button
              onClick={handleShare}
              size="sm"
              disabled={loading || !email}
            >
              {loading ? "Sending..." : "Invite"}
            </Button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <Separator className="my-4" />

        {fetching ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Loading collaborators...
          </p>
        ) : (
          <ul className="max-h-60 divide-y overflow-y-auto">
            {collaborators.map((collaborator) => (
              <CollaboratorRow
                key={collaborator.id}
                roomId={roomId}
                creatorId={creatorId}
                email={collaborator.email}
                collaborator={collaborator}
                user={{
                  id: currentUser.email,
                  name: currentUser.name,
                  email: currentUser.email,
                  avatar: currentUser.avatar,
                  color: "",
                }}
              />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
