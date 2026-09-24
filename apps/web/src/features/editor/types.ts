// `User`, `UserType`, `RoomMetadata`, `MinimalUser` are ambient globals
// declared in `src/types/global.d.ts` (used across 3+ features).

export type CollaborativeRoomProps = {
  roomId: string;
  roomMetadata: RoomMetadata;
  users: User[];
  currentUserType: UserType;
  currentUser: MinimalUser;
  /**
   * Whether this document has any indexed `document_chunk` rows (P2-4) —
   * `false` for a manually-created document that was never generated from
   * a source URL, or one whose ingestion hasn't reached the chunk-and-
   * embed step yet. Gates whether the "Ask about this" chat tab (P2-5)
   * renders at all, alongside the existing Discussion tab.
   */
  hasChatSource: boolean;
};
