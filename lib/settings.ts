import { createAdminClient } from "@/lib/supabase/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/config";

/**
 * App-wide settings storage. Single-row JSONB in Supabase, with an env
 * fallback so cap behavior degrades gracefully if the migration hasn't
 * been applied yet, and a memory fallback for dev mode.
 *
 * Reads are cached for a short interval to avoid hitting the DB on every
 * /api/generate/* request — settings change rarely.
 */

export interface CapsSetting {
  perCall: number | null;
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
}

const EMPTY_CAPS: CapsSetting = {
  perCall: null,
  daily: null,
  weekly: null,
  monthly: null,
};

// ── env fallback ─────────────────────────────────────────────────────────────
function envCap(key: string): number | null {
  const raw = process.env[key];
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function envCaps(): CapsSetting {
  return {
    perCall: envCap("COST_CAP_PER_CALL_USD"),
    daily: envCap("COST_CAP_DAILY_USD"),
    weekly: envCap("COST_CAP_WEEKLY_USD"),
    monthly: envCap("COST_CAP_MONTHLY_USD"),
  };
}

// ── dev/memory fallback ──────────────────────────────────────────────────────
const g = global as typeof global & {
  __vaCapsSetting?: CapsSetting;
  __vaCapsCache?: { value: CapsSetting; expiresAt: number };
};
if (!g.__vaCapsSetting) g.__vaCapsSetting = { ...EMPTY_CAPS };

// ── caching ──────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 30_000;

function readCache(): CapsSetting | null {
  const c = g.__vaCapsCache;
  if (c && c.expiresAt > Date.now()) return c.value;
  return null;
}

function writeCache(value: CapsSetting): void {
  g.__vaCapsCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
}

export function invalidateCapsCache(): void {
  g.__vaCapsCache = undefined;
}

// ── merge helper ─────────────────────────────────────────────────────────────
/**
 * Layer DB → env → null. DB wins; env fills any DB null so admins can pre-seed
 * caps via env before the migration is applied or to set a hard floor.
 */
function mergeCaps(db: CapsSetting, env: CapsSetting): CapsSetting {
  return {
    perCall: db.perCall ?? env.perCall,
    daily: db.daily ?? env.daily,
    weekly: db.weekly ?? env.weekly,
    monthly: db.monthly ?? env.monthly,
  };
}

function normalize(raw: Partial<CapsSetting> | undefined | null): CapsSetting {
  if (!raw) return { ...EMPTY_CAPS };
  const norm = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number.parseFloat(String(v));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return {
    perCall: norm(raw.perCall),
    daily: norm(raw.daily),
    weekly: norm(raw.weekly),
    monthly: norm(raw.monthly),
  };
}

// ── public API ───────────────────────────────────────────────────────────────
export async function getCapsSetting(): Promise<CapsSetting> {
  const cached = readCache();
  if (cached) return cached;

  const env = envCaps();
  let db: CapsSetting = { ...EMPTY_CAPS };

  if (!SUPABASE_CONFIGURED) {
    db = normalize(g.__vaCapsSetting);
  } else {
    try {
      const supabase = await createAdminClient();
      const { data, error } = await supabase
        .from("app_settings")
        .select("caps")
        .eq("id", true)
        .single();
      if (error) throw error;
      db = normalize(data?.caps as Partial<CapsSetting> | undefined);
    } catch {
      // Migration may not yet be applied — silently fall through to env only.
    }
  }

  const merged = mergeCaps(db, env);
  writeCache(merged);
  return merged;
}

export async function updateCapsSetting(
  patch: Partial<CapsSetting>,
  userId?: string
): Promise<CapsSetting> {
  const next = normalize({ ...(await getRawDbCaps()), ...patch });

  if (!SUPABASE_CONFIGURED) {
    g.__vaCapsSetting = next;
  } else {
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("app_settings")
      .update({
        caps: next,
        updated_at: new Date().toISOString(),
        updated_by: userId ?? null,
      })
      .eq("id", true);
    if (error) {
      // Fall back to upsert in case the seed row is missing.
      const { error: upErr } = await supabase
        .from("app_settings")
        .upsert({ id: true, caps: next, updated_by: userId ?? null });
      if (upErr) throw new Error(upErr.message);
    }
  }

  invalidateCapsCache();
  return mergeCaps(next, envCaps());
}

async function getRawDbCaps(): Promise<CapsSetting> {
  if (!SUPABASE_CONFIGURED) return normalize(g.__vaCapsSetting);
  try {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from("app_settings")
      .select("caps")
      .eq("id", true)
      .single();
    return normalize(data?.caps as Partial<CapsSetting> | undefined);
  } catch {
    return { ...EMPTY_CAPS };
  }
}
