// One-off backfill for P0-3: populates `documentCollaborator` for documents that were
// shared via Liveblocks before Postgres became the source of truth for dashboard listing.
// Run once after deploying that change: `pnpm --filter web run backfill:collaborators`
// Safe to re-run — skips documents/users that already have a matching row.

import { db, document, documentCollaborator, user } from "@collabnow/db";
import { and, eq } from "drizzle-orm";
import { liveblocks } from "../src/lib/liveblocks";

async function main() {
  const documents = await db
    .select({
      id: document.id,
      roomId: document.roomId,
      creatorId: document.creatorId,
    })
    .from(document);

  let inserted = 0;
  let skipped = 0;

  for (const doc of documents) {
    let room;
    try {
      room = await liveblocks.getRoom(doc.roomId);
    } catch (error) {
      console.error(`Skipping ${doc.roomId}: could not load Liveblocks room (${error})`);
      skipped++;
      continue;
    }

    const entries = Object.entries(room.usersAccesses ?? {});
    for (const [email, access] of entries) {
      const isEditor = (access as string[]).includes("room:write");

      const [targetUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);
      if (!targetUser || targetUser.id === doc.creatorId) continue;

      const [existing] = await db
        .select({ id: documentCollaborator.id })
        .from(documentCollaborator)
        .where(
          and(
            eq(documentCollaborator.documentId, doc.id),
            eq(documentCollaborator.userId, targetUser.id)
          )
        )
        .limit(1);
      if (existing) {
        skipped++;
        continue;
      }

      await db.insert(documentCollaborator).values({
        documentId: doc.id,
        userId: targetUser.id,
        role: isEditor ? "editor" : "viewer",
        addedBy: doc.creatorId,
      });
      inserted++;
    }
  }

  console.log(`Backfill complete: ${inserted} collaborator rows inserted, ${skipped} skipped.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
