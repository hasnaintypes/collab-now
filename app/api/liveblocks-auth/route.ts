import { liveblocks } from "@/lib/liveblocks";
import { auth } from "@/lib/auth";
import { getUserColor } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id, name, email, image } = session.user;

  // Liveblocks userInfo must be under 2048 bytes — skip large base64 avatars
  const avatar = image && !image.startsWith("data:") ? image : "";

  const { status, body } = await liveblocks.identifyUser(
    { userId: email, groupIds: [] },
    {
      userInfo: {
        id,
        name,
        email,
        avatar,
        color: getUserColor(id),
      },
    }
  );

  return new Response(body, { status });
}
