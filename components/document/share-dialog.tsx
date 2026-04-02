"use client";

import { useState } from "react";
import { useSelf } from "@liveblocks/react/suspense";
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
import UserTypeSelect from "./user-type-select";
import CollaboratorRow from "./collaborator-row";
import { updateDocumentAccess } from "@/lib/actions/room.actions";

export default function ShareDialog({
  roomId,
  collaborators,
  creatorId,
  currentUserType,
}: ShareDocumentDialogProps) {
  const user = useSelf();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<UserType>("viewer");

  const handleShare = async () => {
    setLoading(true);
    await updateDocumentAccess({
      roomId,
      email,
      userType,
      updatedBy: user.info,
    });
    setEmail("");
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={currentUserType !== "editor"}
        >
          <Share2 className="size-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Manage who can view and edit this document.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <Label htmlFor="share-email">Email address</Label>
          <div className="flex items-center gap-2">
            <Input
              id="share-email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <UserTypeSelect
              userType={userType}
              setUserType={setUserType}
            />
            <Button onClick={handleShare} size="sm" disabled={loading || !email}>
              {loading ? "Sending..." : "Invite"}
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        <ul className="max-h-60 divide-y overflow-y-auto">
          {collaborators.map((collaborator) => (
            <CollaboratorRow
              key={collaborator.id}
              roomId={roomId}
              creatorId={creatorId}
              email={collaborator.email}
              collaborator={collaborator}
              user={user.info}
            />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
