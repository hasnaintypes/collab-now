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

// The `{name, email, avatar}` subset of `User` used wherever a component only
// needs enough identity to render/attribute something (a share dialog's
// "shared by", a document navbar's account menu, etc.) and isn't handed a
// full `User` (which additionally requires `id`/`color`).
declare type MinimalUser = Pick<User, "name" | "email" | "avatar">;

declare type RoomMetadata = {
  creatorId: string;
  email: string;
  title: string;
};
