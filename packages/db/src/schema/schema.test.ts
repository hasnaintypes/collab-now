import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  user,
  session,
  account,
  verification,
  workspace,
  workspaceMember,
  workspaceInvite,
  document,
  documentCollaborator,
  documentStar,
  activityLog,
  rateLimitBucket,
} from "./index";

// These don't touch a real database — `getTableConfig` just introspects the
// Drizzle table builders in-memory. The point is to pin down the schema
// invariants the app's server actions actually rely on (cascade behavior,
// uniqueness, DB column naming) so an accidental schema edit fails a fast
// local test instead of surfacing as a production bug — e.g. the account
// deletion flow (`features/auth/lib/server.ts`'s `beforeDelete` hook) only
// works correctly because `document.creatorId` cascades on user delete.

function foreignKey(table: Parameters<typeof getTableConfig>[0], columnName: string) {
  const { foreignKeys } = getTableConfig(table);
  const fk = foreignKeys.find((f) =>
    f.reference().columns.some((c) => c.name === columnName)
  );
  if (!fk) {
    throw new Error(`No foreign key found on column "${columnName}"`);
  }
  return fk;
}

describe("workspace", () => {
  it("cascades delete when its owner is deleted", () => {
    const fk = foreignKey(workspace, "owner_id");
    expect(fk.onDelete).toBe("cascade");
    expect(fk.reference().foreignTable).toBe(user);
  });
});

describe("workspaceMember", () => {
  it("cascades delete when its workspace or user is deleted", () => {
    expect(foreignKey(workspaceMember, "workspace_id").onDelete).toBe("cascade");
    expect(foreignKey(workspaceMember, "user_id").onDelete).toBe("cascade");
  });

  it("defaults role to member", () => {
    const { columns } = getTableConfig(workspaceMember);
    const role = columns.find((c) => c.name === "role");
    expect(role?.default).toBe("member");
    expect(role?.notNull).toBe(true);
  });
});

describe("workspaceInvite", () => {
  it("has a unique token and defaults to pending status", () => {
    const { columns } = getTableConfig(workspaceInvite);
    const token = columns.find((c) => c.name === "token");
    const status = columns.find((c) => c.name === "status");
    expect(token?.isUnique).toBe(true);
    expect(status?.default).toBe("pending");
  });

  it("cascades delete when its workspace or inviter is deleted", () => {
    expect(foreignKey(workspaceInvite, "workspace_id").onDelete).toBe("cascade");
    expect(foreignKey(workspaceInvite, "invited_by").onDelete).toBe("cascade");
  });
});

describe("document", () => {
  it("cascades delete when its creator or workspace is deleted", () => {
    // Relied on by `beforeDelete` in features/auth/lib/server.ts, which
    // pre-emptively destroys the creator's Liveblocks rooms *because* this
    // cascade is about to delete their `document` rows.
    expect(foreignKey(document, "creator_id").onDelete).toBe("cascade");
    expect(foreignKey(document, "workspace_id").onDelete).toBe("cascade");
  });

  it("has a unique roomId linking it to its Liveblocks room", () => {
    const { columns } = getTableConfig(document);
    const roomId = columns.find((c) => c.name === "room_id");
    expect(roomId?.isUnique).toBe(true);
    expect(roomId?.notNull).toBe(true);
  });

  it("defaults isArchived to false", () => {
    const { columns } = getTableConfig(document);
    const isArchived = columns.find((c) => c.name === "is_archived");
    expect(isArchived?.default).toBe(false);
  });

  it("has (createdAt, id) and creatorId/workspaceId indexes for keyset pagination", () => {
    const { indexes } = getTableConfig(document);
    const names = indexes.map((i) => i.config.name);
    expect(names).toContain("document_created_at_id_idx");
    expect(names).toContain("document_creator_id_idx");
    expect(names).toContain("document_workspace_id_idx");
  });
});

describe("documentCollaborator", () => {
  it("only allows one collaborator row per (document, user) pair", () => {
    // Declared via `uniqueIndex(...)` in the schema, so it shows up as a
    // unique `Index`, not a table-level `UniqueConstraint`.
    const { indexes } = getTableConfig(documentCollaborator);
    const uniqueIndex = indexes.find(
      (i) => i.config.name === "document_collaborator_document_user_idx"
    );
    expect(uniqueIndex?.config.unique).toBe(true);
  });

  it("cascades delete when its document or user is deleted", () => {
    expect(foreignKey(documentCollaborator, "document_id").onDelete).toBe("cascade");
    expect(foreignKey(documentCollaborator, "user_id").onDelete).toBe("cascade");
  });
});

describe("documentStar", () => {
  it("cascades delete when its document or user is deleted", () => {
    expect(foreignKey(documentStar, "document_id").onDelete).toBe("cascade");
    expect(foreignKey(documentStar, "user_id").onDelete).toBe("cascade");
  });
});

describe("activityLog", () => {
  it("sets documentId to null (rather than deleting the log) when the document is deleted", () => {
    // Intentional: activity history should survive document deletion —
    // `deleteDocument` in room.actions.ts still logs a "deleted" entry
    // referencing the now-gone document.
    expect(foreignKey(activityLog, "document_id").onDelete).toBe("set null");
  });

  it("cascades delete when its workspace or user is deleted", () => {
    expect(foreignKey(activityLog, "workspace_id").onDelete).toBe("cascade");
    expect(foreignKey(activityLog, "user_id").onDelete).toBe("cascade");
  });
});

describe("rateLimitBucket", () => {
  it("keys on the bucket key and defaults count to 0", () => {
    const { columns, primaryKeys } = getTableConfig(rateLimitBucket);
    const key = columns.find((c) => c.name === "key");
    const count = columns.find((c) => c.name === "count");
    expect(key?.primary).toBe(true);
    expect(primaryKeys).toHaveLength(0); // single-column PK is on the column itself, not a composite primaryKey()
    expect(count?.default).toBe(0);
  });
});

describe("auth tables (Better Auth-managed)", () => {
  it("session and account cascade delete when their user is deleted", () => {
    expect(foreignKey(session, "user_id").onDelete).toBe("cascade");
    expect(foreignKey(account, "user_id").onDelete).toBe("cascade");
  });

  it("user.email is unique", () => {
    const { columns } = getTableConfig(user);
    const email = columns.find((c) => c.name === "email");
    expect(email?.isUnique).toBe(true);
  });

  it("verification has no foreign keys (identifier is a free-form string, not always a user id)", () => {
    const { foreignKeys } = getTableConfig(verification);
    expect(foreignKeys).toHaveLength(0);
  });
});
