import { afterEach, describe, expect, it } from "vitest";
import { devModelStore, type DevModel } from "@/lib/dev-store";

const ids: string[] = [];

afterEach(() => {
  // Best-effort cleanup; the in-memory map is shared via globalThis.
  // We can't clear it directly without exposing internals, so we track inserted
  // IDs and rely on tests not asserting full list contents.
});

function makeModel(name: string, daysAgo = 0): DevModel {
  const id = crypto.randomUUID();
  ids.push(id);
  return {
    id,
    name,
    status: "active",
    created_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  };
}

describe("devModelStore", () => {
  it("adds and retrieves a model", () => {
    const m = makeModel("Aria");
    devModelStore.add(m);
    expect(devModelStore.get(m.id)).toEqual(m);
  });

  it("lists newest first", () => {
    const newer = makeModel("Newer", 0);
    const older = makeModel("Older", 5);
    devModelStore.add(older);
    devModelStore.add(newer);
    const list = devModelStore.list();
    const newerIdx = list.findIndex((m) => m.id === newer.id);
    const olderIdx = list.findIndex((m) => m.id === older.id);
    expect(newerIdx).toBeLessThan(olderIdx);
  });

  it("merges patches on update", () => {
    const m = makeModel("Patch Me");
    devModelStore.add(m);
    devModelStore.update(m.id, { bio: "edited bio" });
    expect(devModelStore.get(m.id)?.bio).toBe("edited bio");
    // unchanged fields preserved
    expect(devModelStore.get(m.id)?.name).toBe("Patch Me");
  });

  it("returns undefined for unknown ids", () => {
    expect(devModelStore.get("does-not-exist")).toBeUndefined();
  });
});
