export type ActivityAction =
  | "created"
  | "shared"
  | "deleted"
  | "renamed"
  | "invited"
  | "joined"
  | "starred"
  | "unstarred"
  | "archived"
  | "unarchived";

export type ActivityItem = {
  id: string;
  action: string;
  metadata: string | null;
  createdAt: string;
  userName: string;
  userImage: string | null;
};

export type GetActivityOptions = {
  cursor?: string | null;
  limit?: number;
};

export type PaginatedActivity = {
  activities: ActivityItem[];
  nextCursor: string | null;
};
