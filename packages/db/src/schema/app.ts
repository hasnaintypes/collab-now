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

// ── Ingestion Job ────────────────────────────────────────────
// P1-1 / PRD §9: one row per URL submitted for AI notes generation
// (YouTube video or article). `sourceType`/`status` are plain `text`
// (not a DB enum), matching `role`/`action` elsewhere in this schema —
// validated at the app layer, not the DB layer.

export const ingestionJob = pgTable(
  "ingestion_job",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    sourceUrl: text("source_url").notNull(),
    /** "youtube" | "article" */
    sourceType: text("source_type").notNull(),
    /** "queued" | "processing" | "ready" | "failed" */
    status: text("status").notNull().default("queued"),
    errorMessage: text("error_message"),
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("ingestion_job_requester_id_idx").on(table.requesterId),
    index("ingestion_job_workspace_id_idx").on(table.workspaceId),
  ]
);

// ── Source Content ───────────────────────────────────────────
// P1-1 / PRD §9 & §10: the retained raw transcript/article text for an
// `ingestionJob`, reused for style regeneration and chat/RAG. `documentId`
// is nullable because a `document` doesn't exist yet while the job is
// still queued/processing — it's filled in once notes generation succeeds.
// Both FKs cascade: deleting the job (rare) or deleting the resulting
// document (normal user action) purges this row, per the P0-17 retention
// decision — there is no independent TTL.

export const sourceContent = pgTable(
  "source_content",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    ingestionJobId: text("ingestion_job_id")
      .notNull()
      .references(() => ingestionJob.id, { onDelete: "cascade" }),
    documentId: text("document_id").references(() => document.id, {
      onDelete: "cascade",
    }),
    rawText: text("raw_text").notNull(),
    /** "en" | "hi" | "ur" — detected source language, per PRD FR-6. */
    sourceLanguage: text("source_language").notNull(),
    /**
     * P1-6 / PRD FR-8: the English notes Gemini generated from `rawText`,
     * in whichever style `noteStyle` records. Nullable because it's only
     * filled in once that step of the ingestion job succeeds — a job can
     * be `"ready"` with `rawText` persisted but this still null if it's
     * mid-pipeline. Kept here rather than on `ingestionJob` since this
     * table is already the one-row-per-job home for a job's content, and
     * already carries `documentId`, the other field P1-7 fills in later.
     */
    generatedNotes: text("generated_notes"),
    /**
     * P2-1 / PRD FR-9, FR-11: which of the 5 note styles `generatedNotes`
     * is currently in — see `NoteStyle` in
     * `features/ingestion/lib/notes-generator.ts` for the literal values.
     * Defaults to the MVP's single style (P1-6) both for new rows created
     * before a style is chosen and to backfill existing rows on migration;
     * plain `text` rather than a DB enum, matching `sourceType`/`status`
     * elsewhere in this schema — validated at the app layer, not here.
     * Regenerating in a different style (P2-1's `regenerateNotes` action)
     * overwrites both this and `generatedNotes` together, reusing this
     * row's own `rawText`/`sourceLanguage` rather than re-fetching or
     * re-extracting anything, per FR-9.
     */
    noteStyle: text("note_style").notNull().default("bullet-outline"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // One source_content row per job.
    uniqueIndex("source_content_ingestion_job_id_idx").on(
      table.ingestionJobId
    ),
    // At most one source_content row per document (multiple NULLs, for
    // jobs that haven't produced a document yet, are allowed — Postgres
    // unique indexes treat each NULL as distinct).
    uniqueIndex("source_content_document_id_idx").on(table.documentId),
  ]
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
