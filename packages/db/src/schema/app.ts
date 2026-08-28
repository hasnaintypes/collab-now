import {
  pgTable,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { user } from "./auth";

// ── Workspace ────────────────────────────────────────────────

export const workspace = pgTable("workspace", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Workspace Member ─────────────────────────────────────────

export const workspaceMember = pgTable("workspace_member", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// ── Workspace Invite ─────────────────────────────────────────

export const workspaceInvite = pgTable("workspace_invite", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Document ─────────────────────────────────────────────────

export const document = pgTable(
  "document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    roomId: text("room_id").notNull().unique(),
    title: text("title").notNull().default("Untitled document"),
    creatorId: text("creator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Supports the (createdAt, id) keyset pagination used by document listing.
    index("document_created_at_id_idx").on(table.createdAt, table.id),
    index("document_creator_id_idx").on(table.creatorId),
    index("document_workspace_id_idx").on(table.workspaceId),
  ]
);

// ── Document Collaborator ────────────────────────────────────

export const documentCollaborator = pgTable(
  "document_collaborator",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    documentId: text("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("viewer"),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    addedBy: text("added_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("document_collaborator_document_user_idx").on(
      table.documentId,
      table.userId
    ),
    index("document_collaborator_user_id_idx").on(table.userId),
  ]
);

// ── Document Star ────────────────────────────────────────────

export const documentStar = pgTable(
  "document_star",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    documentId: text("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("document_star_user_id_idx").on(table.userId)]
);

// ── Activity Log ─────────────────────────────────────────────

export const activityLog = pgTable(
  "activity_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    documentId: text("document_id").references(() => document.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // Supports the (workspaceId, createdAt, id) keyset pagination used by the activity feed.
    index("activity_log_workspace_created_at_id_idx").on(
      table.workspaceId,
      table.createdAt,
      table.id
    ),
  ]
);
