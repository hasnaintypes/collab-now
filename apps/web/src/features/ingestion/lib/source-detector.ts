/**
 * Re-exports `@collabnow/shared`'s URL classification logic (P2-6 moved
 * the implementation there so `apps/extension` can share it — see that
 * module's doc comment for why). Kept as a thin shim, rather than updating
 * every call site in this feature to import `@collabnow/shared` directly,
 * so this move doesn't ripple through `ingestion.actions.ts`,
 * `inngest/events.ts`, `inngest/process-ingestion-job.ts`, and `types.ts`.
 */
export { detectSourceType, type SourceType } from "@collabnow/shared";
