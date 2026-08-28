// Centralized `unstable_cache` tag naming so read paths and the mutations that
// invalidate them can't drift out of sync with each other.

export const documentsTag = (userId: string) => `documents-${userId}`;

export const workspaceMembersTag = (workspaceId: string) =>
  `workspace-members-${workspaceId}`;

export const activityTag = (workspaceId: string) => `activity-${workspaceId}`;
