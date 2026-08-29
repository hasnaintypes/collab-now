export type WorkspaceRole = "owner" | "admin" | "member";

export type InviteStatus = "pending" | "accepted" | "expired";

export type SidebarProps = {
  workspaceName: string;
  workspaceRole: WorkspaceRole;
  memberCount: number;
  workspaceId: string;
};

export type InviteMemberDialogProps = {
  workspaceId: string;
  invitedById: string;
};

export type WorkspaceData = {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  memberCount: number;
};

export type WorkspaceMember = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  joinedAt: string;
};

export type WorkspaceSearchResult = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

export type WorkspaceInvite = PendingInvite & {
  workspaceId: string;
  token: string;
  status: InviteStatus;
  expiresAt: string;
};

// `acceptInvite`'s success payload — a valid invite token resolves to one of
// two outcomes: the user already has an account and joined immediately, or
// they need to sign up first (see `apps/web/src/app/(root)/invite/accept/page.tsx`).
// Only an invalid/expired token is a failure (`ActionResult`'s `success: false`).
export type AcceptInviteResult =
  | { outcome: "joined"; workspaceId: string }
  | { outcome: "needsSignUp"; email: string };
