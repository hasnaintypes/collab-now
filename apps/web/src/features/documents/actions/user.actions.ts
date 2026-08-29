"use server";

import { parseStringify, getUserColor } from "@/lib/utils";
import { liveblocks } from "@/lib/liveblocks";
import { db, user } from "@collabnow/db";
import { inArray } from "drizzle-orm";

// `getUsers` and `getDocumentUsers` are deliberately NOT migrated to the
// shared `ActionResult<T>` convention (see docs/ROADMAP.md P0-7 and
// `@/lib/action-result`). Both feed directly into Liveblocks'
// `resolveUsers`/`resolveMentionSuggestions` callbacks
// (`apps/web/src/app/(root)/layout.tsx`), which require a plain
// array/undefined return — wrapping them in `{success, data}` would break
// that integration. Errors here are logged and degraded to a safe fallback
// instead of thrown, so a lookup failure never breaks presence/mentions UI.

export const getUsers = async ({ userIds }: { userIds: string[] }) => {
  try {
    const dbUsers = await db
      .select()
      .from(user)
      .where(inArray(user.email, userIds));

    const users = dbUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.image || "",
      color: getUserColor(u.id),
    }));

    const sortedUsers = userIds.map(
      (email) =>
        users.find((u) => u.email === email) || {
          id: email,
          name: email,
          email,
          avatar: "",
          color: getUserColor(email),
        }
    );

    return parseStringify(sortedUsers);
  } catch (error) {
    console.error(`Error getting users: ${error}`);
    return userIds.map((email) => ({
      id: email,
      name: email,
      email,
      avatar: "",
      color: getUserColor(email),
    }));
  }
};

export const getDocumentUsers = async ({
  roomId,
  currentUser,
  text,
}: {
  roomId: string;
  currentUser: string;
  text: string;
}) => {
  try {
    const room = await liveblocks.getRoom(roomId);

    const users = Object.keys(room.usersAccesses).filter(
      (email) => email !== currentUser
    );

    if (text.length) {
      const lowerText = text.toLowerCase();
      const filtered = users.filter((email: string) =>
        email.toLowerCase().includes(lowerText)
      );
      return parseStringify(filtered);
    }

    return parseStringify(users);
  } catch (error) {
    console.error(`Error getting document users: ${error}`);
    // Explicit empty array (not `undefined`) — this feeds Liveblocks'
    // `resolveMentionSuggestions` callback directly, so "no suggestions" is a
    // safer failure mode than an implicit `undefined`.
    return [];
  }
};
