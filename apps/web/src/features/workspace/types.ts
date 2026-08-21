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
