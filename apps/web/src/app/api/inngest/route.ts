import { serve } from "inngest/next";

import { inngest, noopIngestionTestJob } from "@/lib/inngest";
import { processIngestionJob } from "@/features/ingestion/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [noopIngestionTestJob, processIngestionJob],
});
