import { liveblocks } from "@/lib/liveblocks";
import { auth } from "@/lib/auth";
import { getUserColor } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id, name, email, image } = session.user;

  const { status, body } = await liveblocks.identifyUser(
    { userId: email, groupIds: [] },
    {
      userInfo: {
        id,
        name,
        email,
        avatar: image || "",
        color: getUserColor(id),
      },
    }
  );

  return new Response(body, { status });
}
