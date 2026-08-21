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
