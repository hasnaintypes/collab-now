declare type AccessType = ["room:write"] | ["room:read", "room:presence:write"];

declare type RoomAccesses = Record<string, AccessType>;

declare type UserType = "creator" | "editor" | "viewer";

declare type RoomMetadata = {
  creatorId: string;
  email: string;
  title: string;
};

declare type CreateDocumentParams = {
  userId: string;
  email: string;
  workspaceId?: string;
};

declare type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  color: string;
  userType?: UserType;
};

declare type ShareDocumentParams = {
  roomId: string;
  email: string;
  userType: UserType;
  updatedBy: User;
};

declare type UserTypeSelectorParams = {
  userType: string;
  setUserType: React.Dispatch<React.SetStateAction<UserType>>;
  onClickHandler?: (value: string) => void;
};

declare type ShareDocumentDialogProps = {
  roomId: string;
  collaborators: User[];
  creatorId: string;
  currentUserType: UserType;
};

declare type CollaborativeRoomProps = {
  roomId: string;
  roomMetadata: RoomMetadata;
  users: User[];
  currentUserType: UserType;
  currentUser: { name: string; email: string; avatar: string };
};

declare type AddDocumentBtnProps = {
  userId: string;
  email: string;
  workspaceId?: string;
};

declare type SidebarProps = {
  workspaceName: string;
  workspaceRole: WorkspaceRole;
  memberCount: number;
  workspaceId: string;
};

declare type InviteMemberDialogProps = {
  workspaceId: string;
  invitedById: string;
};

declare type DeleteModalProps = { roomId: string };

declare type CollaboratorProps = {
  roomId: string;
  email: string;
  creatorId: string;
  collaborator: User;
  user: User;
};

declare type WorkspaceRole = "owner" | "admin" | "member";
declare type InviteStatus = "pending" | "accepted" | "expired";
declare type ActivityAction = "created" | "shared" | "deleted" | "renamed" | "invited" | "joined" | "starred" | "unstarred" | "archived" | "unarchived";

declare type RoomDocument = {
  id: string;
  metadata: { title: string; creatorId?: string };
  createdAt: string;
  isStarred?: boolean;
  isArchived?: boolean;
};
