// `User`, `UserType`, `RoomMetadata` are ambient globals declared in
// `src/types/global.d.ts` (used across 3+ features).

export type CollaborativeRoomProps = {
  roomId: string;
  roomMetadata: RoomMetadata;
  users: User[];
  currentUserType: UserType;
  currentUser: { name: string; email: string; avatar: string };
};
