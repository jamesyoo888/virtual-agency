import type { Model } from "@/types";

/**
 * In-memory model store for dev mode (no DB).
 * Uses Node.js global to survive module re-instantiation across
 * Next.js API routes and Server Components.
 */

// Wizard records carry extra fields not in the final Model schema
// (angle_images, final_images), so widen to accept them while
// keeping core identity fields strict.
export type DevModel = Partial<Model> & {
  id: string;
  created_at: string;
  angle_images?: Record<string, string | null>;
  final_images?: string[];
};

const g = global as typeof global & { __vaDevModels?: Map<string, DevModel> };
if (!g.__vaDevModels) g.__vaDevModels = new Map<string, DevModel>();
const store = g.__vaDevModels;

export const devModelStore = {
  add(model: DevModel) {
    store.set(model.id, model);
  },
  get(id: string): DevModel | undefined {
    return store.get(id);
  },
  list(): DevModel[] {
    return Array.from(store.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
  update(id: string, patch: Partial<DevModel>) {
    const existing = store.get(id);
    if (existing) store.set(id, { ...existing, ...patch });
  },
};
