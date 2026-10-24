import { describe, expect, it, vi, beforeEach } from "vitest";

function selectChain(rows: unknown[]) {
  const builder: {
    from: () => typeof builder;
    where: () => typeof builder;
    limit: () => Promise<unknown[]>;
  } = {} as never;
  builder.from = vi.fn(() => builder);
  builder.where = vi.fn(() => builder);
  builder.limit = vi.fn(() => Promise.resolve(rows));
  return builder;
}

const {
  returningMock,
  onConflictDoUpdateMock,
  valuesMock,
  insertMock,
  whereMock,
  setMock,
  updateMock,
  selectMock,
} = vi.hoisted(() => {
  const returningMock = vi.fn();
  const onConflictDoUpdateMock = vi.fn(() => ({ returning: returningMock }));
  const valuesMock = vi.fn(() => ({ onConflictDoUpdate: onConflictDoUpdateMock }));
  const insertMock = vi.fn(() => ({ values: valuesMock }));
  const whereMock = vi.fn(() => Promise.resolve());
  const setMock = vi.fn(() => ({ where: whereMock }));
  const updateMock = vi.fn(() => ({ set: setMock }));
  const selectMock = vi.fn();
  return {
    returningMock,
    onConflictDoUpdateMock,
    valuesMock,
    insertMock,
    whereMock,
    setMock,
    updateMock,
    selectMock,
  };
});

vi.mock("@collabnow/db", () => ({
  db: { insert: insertMock, update: updateMock, select: selectMock },
  usageCounter: {
    workspaceId: "usage_counter.workspace_id",
    periodStart: "usage_counter.period_start",
    notesGenerated: "usage_counter.notes_generated",
  },
}));

const { getEffectivePlanMock } = vi.hoisted(() => ({
  getEffectivePlanMock: vi.fn(),
}));
vi.mock("./workspace-plan", () => ({ getEffectivePlan: getEffectivePlanMock }));

vi.mock("./plan-limits", () => ({
  PLAN_NOTES_LIMIT: { free: 5, pro: 100, team: 100 },
}));

const { reserveNotesGenerationSlot, releaseNotesGenerationSlot } =
  await import("./usage-enforcement");

beforeEach(() => {
  returningMock.mockReset();
  onConflictDoUpdateMock.mockClear();
  valuesMock.mockClear();
  insertMock.mockClear();
  whereMock.mockClear();
  setMock.mockClear();
  updateMock.mockClear();
  selectMock.mockReset();
  getEffectivePlanMock.mockReset().mockResolvedValue("free");
});

describe("reserveNotesGenerationSlot", () => {
  it("allows the reservation when the upsert returns the new count", async () => {
    returningMock.mockResolvedValueOnce([{ notesGenerated: 1 }]);

    const result = await reserveNotesGenerationSlot("workspace-1");

    expect(result).toEqual({ allowed: true, limit: 5, used: 1 });
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1", notesGenerated: 1 })
    );
  });

  it("uses the plan's configured limit when building the guard", async () => {
    getEffectivePlanMock.mockResolvedValueOnce("pro");
    returningMock.mockResolvedValueOnce([{ notesGenerated: 42 }]);

    const result = await reserveNotesGenerationSlot("workspace-1");

    expect(result.limit).toBe(100);
  });

  it("blocks the reservation when the WHERE guard skips the update (already at the cap)", async () => {
    returningMock.mockResolvedValueOnce([]); // conflict, but WHERE blocked it
    selectMock.mockReturnValueOnce(selectChain([{ notesGenerated: 5 }]));

    const result = await reserveNotesGenerationSlot("workspace-1");

    expect(result).toEqual({ allowed: false, limit: 5, used: 5 });
  });

  it("falls back to the configured limit as 'used' if the follow-up read unexpectedly finds nothing", async () => {
    returningMock.mockResolvedValueOnce([]);
    selectMock.mockReturnValueOnce(selectChain([]));

    const result = await reserveNotesGenerationSlot("workspace-1");

    expect(result).toEqual({ allowed: false, limit: 5, used: 5 });
  });
});

describe("releaseNotesGenerationSlot", () => {
  it("updates the counter for the current period", async () => {
    await releaseNotesGenerationSlot("workspace-1");

    expect(updateMock).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalled();
    expect(whereMock).toHaveBeenCalled();
  });
});
