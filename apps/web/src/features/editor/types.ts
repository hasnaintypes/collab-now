import type { NoteStyle } from "@/features/ingestion/types";

// `User`, `UserType`, `RoomMetadata`, `MinimalUser` are ambient globals
// declared in `src/types/global.d.ts` (used across 3+ features).

export type CollaborativeRoomProps = {
  roomId: string;
  roomMetadata: RoomMetadata;
  users: User[];
  currentUserType: UserType;
  currentUser: MinimalUser;
  /**
   * The document's current note style (P2-1/P2-2), or `null` for a
   * manually-created document that was never generated from a source URL
   * — `DocumentNavbar` only renders the style picker when this is non-null,
   * satisfying P2-2's "without touching non-generated documents".
   */
  noteStyle: NoteStyle | null;
};
