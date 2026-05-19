import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock the supabase server client. The persist module reads the user from
// it, so we need to stub auth.getUser to return a stable id and capture
// .from(table).insert(payload) calls without hitting any network.

const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    from: () => ({ insert: insertSpy }),
  }),
}));

vi.mock("@/lib/supabase/config", () => ({
  SUPABASE_CONFIGURED: true,
}));

import { persistRfpSubmission, _resetRfpDedupForTests } from "@/lib/rfp/persist";

describe("persistRfpSubmission", () => {
  beforeEach(() => {
    insertSpy.mockClear();
    _resetRfpDedupForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("inserts when the user is authed and inputs are new", async () => {
    await persistRfpSubmission({ campaign: "X" }, []);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const payload = insertSpy.mock.calls[0][0];
    expect(payload.client_id).toBe("u1");
    expect(payload.inputs).toEqual({ campaign: "X" });
    expect(payload.recommended).toEqual([]);
  });

  it("dedups identical inputs within the 1-minute window", async () => {
    await persistRfpSubmission({ campaign: "Y" }, []);
    await persistRfpSubmission({ campaign: "Y" }, []);
    await persistRfpSubmission({ campaign: "Y" }, []);
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });

  it("does not dedup when payload differs", async () => {
    await persistRfpSubmission({ campaign: "A" }, []);
    await persistRfpSubmission({ campaign: "B" }, []);
    expect(insertSpy).toHaveBeenCalledTimes(2);
  });

  it("re-inserts after the dedup window expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    await persistRfpSubmission({ campaign: "Z" }, []);
    vi.setSystemTime(new Date("2026-01-01T00:02:00Z")); // > 1 min later
    await persistRfpSubmission({ campaign: "Z" }, []);
    expect(insertSpy).toHaveBeenCalledTimes(2);
  });
});
