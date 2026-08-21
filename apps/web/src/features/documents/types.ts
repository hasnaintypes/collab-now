import type { Dispatch, SetStateAction } from "react";

// `User`, `UserType`, `RoomMetadata`, `AccessType`, `RoomAccesses` are ambient
// globals declared in `src/types/global.d.ts` (used across 3+ features).

export type CreateDocumentParams = {
  userId: string;
  email: string;
  workspaceId?: string;
};

export type ShareDocumentParams = {
  roomId: string;
  email: string;
  userType: UserType;
  updatedBy: User;
};

export type ShareDocumentDialogProps = {
  roomId: string;
  collaborators: User[];
  creatorId: string;
  currentUserType: UserType;
};

export type AddDocumentBtnProps = {
  userId: string;
  email: string;
  workspaceId?: string;
};

export type DeleteModalProps = { roomId: string };

export type UserTypeSelectorParams = {
  userType: string;
  setUserType: Dispatch<SetStateAction<UserType>>;
  onClickHandler?: (value: string) => void;
};

export type CollaboratorProps = {
  roomId: string;
  email: string;
  creatorId: string;
  collaborator: User;
  user: User;
};

export type RoomDocument = {
  id: string;
  metadata: { title: string; creatorId?: string };
  createdAt: string;
  isStarred?: boolean;
  isArchived?: boolean;
};
