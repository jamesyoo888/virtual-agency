/**
 * In-memory model store for dev mode (no DB).
 * Uses Node.js global to survive module re-instantiation across
 * Next.js API routes and Server Components.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModelRecord = Record<string, any>;

// Attach to global so all module instances share the same Map
const g = global as typeof global & { __vaDevModels?: Map<string, ModelRecord> };
if (!g.__vaDevModels) g.__vaDevModels = new Map<string, ModelRecord>();
const store = g.__vaDevModels;

export const devModelStore = {
  add(model: ModelRecord) {
    store.set(model.id, model);
  },
  get(id: string): ModelRecord | undefined {
    return store.get(id);
  },
  list(): ModelRecord[] {
    return Array.from(store.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
  update(id: string, patch: Partial<ModelRecord>) {
    const existing = store.get(id);
    if (existing) store.set(id, { ...existing, ...patch });
  },
};
