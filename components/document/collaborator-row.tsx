"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import UserTypeSelect from "./user-type-select";
import {
  removeCollaborator,
  updateDocumentAccess,
} from "@/lib/actions/room.actions";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function CollaboratorRow({
  roomId,
  creatorId,
  collaborator,
  email,
  user,
}: CollaboratorProps) {
  const [userType, setUserType] = useState(collaborator.userType || "viewer");
  const [loading, setLoading] = useState(false);

  const handleTypeChange = async (type: string) => {
    setLoading(true);
    await updateDocumentAccess({
      roomId,
      email,
      userType: type as UserType,
      updatedBy: user,
    });
    setLoading(false);
  };

  const handleRemove = async () => {
    setLoading(true);
    await removeCollaborator({ roomId, email });
    setLoading(false);
  };

  return (
    <li className="flex items-center justify-between gap-2 py-3">
      <div className="flex items-center gap-3">
        {collaborator.avatar ? (
          <img
            src={collaborator.avatar}
            alt={collaborator.name}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {getInitials(collaborator.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {collaborator.name}
            {loading && (
              <span className="ml-2 text-xs text-muted-foreground">
                updating...
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {collaborator.email}
          </p>
        </div>
      </div>

      {creatorId === collaborator.id ? (
        <span className="text-xs font-medium text-muted-foreground">Owner</span>
      ) : (
        <div className="flex items-center gap-2">
          <UserTypeSelect
            userType={userType as UserType}
            setUserType={setUserType || "viewer"}
            onClickHandler={handleTypeChange}
          />
          <Button
            variant="ghost"
            size="xs"
            onClick={handleRemove}
            className="text-destructive hover:text-destructive"
          >
            Remove
          </Button>
        </div>
      )}
    </li>
  );
}
