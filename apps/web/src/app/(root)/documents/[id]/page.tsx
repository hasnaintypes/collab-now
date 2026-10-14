import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/features/auth/lib";
import { getDocument } from "@/features/documents/actions/room.actions";
import { getUsers } from "@/features/documents/actions/user.actions";
import { getChatAvailability } from "@/features/chat/actions/chat.actions";
import CollaborativeRoom from "@/features/editor/components/collaborative-room";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const user = session.user;

  const result = await getDocument({ roomId: id, userId: user.email });
  if (!result.success) redirect("/dashboard");
  const room = result.data;

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

  // P2-5: only documents with indexed source content (`document_chunk`)
  // get an "Ask about this" chat tab. Fetched server-side, alongside the
  // room/user data this page already loads, rather than client-side on
  // mount, so the tab renders with no loading flash.
  //
  // A legitimate "manually created document" (no `document_chunk` rows)
  // and a failed lookup (DB blip, lost workspace membership, etc.) both
  // have to resolve to `hasChatSource = false` here — there's no tab to
  // show "an error happened" in either case. But unlike the former, the
  // latter is a real failure, so it's logged server-side rather than
  // silently swallowed, to keep a production outage from looking
  // identical to normal behavior.
  const chatAvailability = await getChatAvailability({ roomId: id });
  if (!chatAvailability.success) {
    console.error(
      `Failed to check chat availability for room ${id}: ${chatAvailability.error}`
    );
  }
  const hasChatSource = chatAvailability.success
    ? chatAvailability.data.available
    : false;

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
      hasChatSource={hasChatSource}
    />
  );
}
