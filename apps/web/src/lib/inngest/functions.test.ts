import { InngestTestEngine } from "@inngest/test";
import { describe, expect, it } from "vitest";

import { noopIngestionTestJob } from "./functions";

// End-to-end proof (P0-16 acceptance criteria) that a job enqueued via an
// event transitions through processing steps to completion — or fails
// cleanly with the right retry behavior — without needing a real deploy or
// a running `inngest dev` server. `InngestTestEngine` runs the actual
// function (real `step.run` calls, not hand-mocked step outputs);
// `t.executeStep(id)` runs up to and returns that step's own result/error,
// keyed by the same human-readable id passed to `step.run` in
// `functions.ts` (internally hashed, but `executeStep` resolves that for
// you), while `t.execute()` runs the whole function to its final output.
describe("noopIngestionTestJob", () => {
  const baseEvent = {
    name: "test/noop.requested" as const,
    data: { jobId: "job-123" },
  };

  it("transitions mark-processing -> do-work -> mark-ready on success", async () => {
    const t = new InngestTestEngine({
      function: noopIngestionTestJob,
      events: [{ ...baseEvent, data: { ...baseEvent.data, input: "hello" } }],
    });

    const markProcessing = await t.executeStep("mark-processing");
    expect(markProcessing.result).toEqual({
      jobId: "job-123",
      status: "processing",
    });

    const doWork = await t.executeStep("do-work");
    expect(doWork.result).toEqual({ echoedInput: "hello" });

    const { result } = await t.execute();
    expect(result).toEqual({
      jobId: "job-123",
      status: "ready",
      result: { echoedInput: "hello" },
    });
  });

  it("defaults echoedInput to null when no input is provided", async () => {
    const t = new InngestTestEngine({
      function: noopIngestionTestJob,
      events: [baseEvent],
    });

    const { result } = await t.execute();

    expect(result).toEqual({
      jobId: "job-123",
      status: "ready",
      result: { echoedInput: null },
    });
  });

  it("throws a retriable error when simulateFailure is set (Inngest retries with backoff)", async () => {
    const t = new InngestTestEngine({
      function: noopIngestionTestJob,
      events: [
        { ...baseEvent, data: { ...baseEvent.data, simulateFailure: true } },
      ],
    });

    const doWork = await t.executeStep("do-work");

    expect(doWork.error).toMatchObject({
      name: "Error",
      message: expect.stringMatching(/transient failure/),
    });
  });

  it("throws a NonRetriableError when simulateNonRetriableFailure is set (fails clean, no retries)", async () => {
    const t = new InngestTestEngine({
      function: noopIngestionTestJob,
      events: [
        {
          ...baseEvent,
          data: { ...baseEvent.data, simulateNonRetriableFailure: true },
        },
      ],
    });

    const doWork = await t.executeStep("do-work");

    // `NonRetriableError` serializes with `name: "NonRetriableError"`, which
    // Inngest checks to skip further retry attempts entirely instead of
    // applying the backoff schedule used for the plain `Error` case above.
    expect(doWork.error).toMatchObject({
      name: "NonRetriableError",
      message: expect.stringMatching(/permanent failure/),
    });
  });
});
