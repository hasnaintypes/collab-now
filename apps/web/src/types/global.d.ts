// Ambient, app-wide domain primitives shared across 3+ features.
// Feature-specific types live in `src/features/<name>/types.ts` and are imported explicitly.

declare type AccessType =
  | ["room:write"]
  | ["room:read", "room:presence:write"];

declare type RoomAccesses = Record<string, AccessType>;

declare type UserType = "creator" | "editor" | "viewer";

declare type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  color: string;
  userType?: UserType;
};

declare type RoomMetadata = {
  creatorId: string;
  email: string;
  title: string;
};
