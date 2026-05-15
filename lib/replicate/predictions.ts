/**
 * Replicate async prediction helpers.
 *
 * For long-running models (video, lipsync) the `Prefer: wait` header used in
 * the image route is not viable — generations can run 1–5 min, beyond
 * Vercel Function maxDuration. Use create + client-side poll instead.
 */

export type ReplicateStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

export interface ReplicatePrediction {
  id: string;
  status: ReplicateStatus;
  // For most video models `output` is a single URL string; some return an array.
  output?: string | string[] | null;
  error?: string | null;
  // Replicate exposes `logs` (debug) and progress hints inconsistently across
  // models; consumers should treat both as best-effort.
  logs?: string | null;
  metrics?: { predict_time?: number } | null;
}

const REPLICATE_BASE = "https://api.replicate.com/v1";

// Bound any single fetch to Replicate so a stalled network call can't pin a
// serverless instance until the platform timeout (and rack up cost). Two
// distinct numbers: `create` returns quickly with a prediction id, while
// `get` is polled — both should be sub-second under normal conditions.
const FETCH_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class ReplicateConfigError extends Error {
  constructor() {
    super("REPLICATE_API_TOKEN is not configured");
    this.name = "ReplicateConfigError";
  }
}

function authHeaders(): Record<string, string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new ReplicateConfigError();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Create a prediction against a model identified by `owner/name`.
 * Returns a normalized prediction object.
 */
async function safeErrorSnippet(res: Response): Promise<string> {
  // Read the body for the server log but never propagate it raw — Replicate
  // error payloads can echo back inputs (URLs, prompts) we'd rather not surface
  // to callers. Keep a short tail so operators can correlate via console.
  try {
    const text = await res.text();
    console.error(`[replicate] ${res.status} body:`, text.slice(0, 500));
  } catch {
    /* ignore */
  }
  return `${res.status} ${res.statusText}`.trim();
}

export async function createPrediction(
  modelPath: string,
  input: Record<string, unknown>
): Promise<ReplicatePrediction> {
  const res = await fetchWithTimeout(
    `${REPLICATE_BASE}/models/${modelPath}/predictions`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ input }),
    }
  );
  if (!res.ok) {
    throw new Error(`Replicate create error: ${await safeErrorSnippet(res)}`);
  }
  return (await res.json()) as ReplicatePrediction;
}

/**
 * Fetch the current state of a prediction by ID.
 */
export async function getPrediction(id: string): Promise<ReplicatePrediction> {
  const res = await fetchWithTimeout(`${REPLICATE_BASE}/predictions/${id}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Replicate get error: ${await safeErrorSnippet(res)}`);
  }
  return (await res.json()) as ReplicatePrediction;
}

/**
 * Normalize an output that may be string or string[] into the first URL.
 */
export function firstOutputUrl(
  output: ReplicatePrediction["output"]
): string | null {
  if (!output) return null;
  if (Array.isArray(output)) return typeof output[0] === "string" ? output[0] : null;
  return typeof output === "string" ? output : null;
}

export const REPLICATE_CONFIGURED = Boolean(process.env.REPLICATE_API_TOKEN);
