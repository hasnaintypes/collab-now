import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getDocument } from "@/lib/actions/room.actions";
import { getUsers } from "@/lib/actions/user.actions";
import CollaborativeRoom from "@/components/document/collaborative-room";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const user = session.user;

  const room = await getDocument({ roomId: id, userId: user.email });
  if (!room) redirect("/dashboard");

  const userIds = Object.keys(room.usersAccesses);
  const users = await getUsers({ userIds });

  const usersData = users.map((u: User) => ({
    ...u,
    userType: room.usersAccesses[u.email]?.includes("room:write")
      ? "editor"
      : "viewer",
  }));

  const currentUserType = room.usersAccesses[user.email]?.includes(
    "room:write"
  )
    ? "editor"
    : "viewer";

  return (
    <CollaborativeRoom
      roomId={id}
      roomMetadata={room.metadata}
      users={usersData}
      currentUserType={currentUserType}
      currentUser={{
        name: user.name,
        email: user.email,
        avatar: user.image || "",
      }}
    />
  );
}
