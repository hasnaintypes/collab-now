"use server";

import { parseStringify, getUserColor } from "../utils";
import { liveblocks } from "../liveblocks";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { inArray } from "drizzle-orm";

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
  }
};
