const MESHY_API_URL = "https://api.meshy.ai";
const MESHY_API_KEY = process.env.MESHY_API_KEY ?? "";

export const MESHY_CONFIGURED = !!MESHY_API_KEY;

export type MeshyTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUCCEEDED"
  | "FAILED"
  | "EXPIRED";

export interface MeshyTask {
  id: string;
  status: MeshyTaskStatus;
  progress: number; // 0-100
  model_urls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    mtl?: string;
    usdz?: string;
  };
  thumbnail_url?: string;
  video_url?: string;
  error_message?: string;
  created_at?: number;
  expires_at?: number;
}

/**
 * Submit an image-to-3D task to Meshy AI.
 * Returns the task ID.
 */
export async function createImageTo3DTask(
  imageUrl: string,
  options?: {
    enablePbr?: boolean;
    surfaceMode?: "hard" | "soft";
    symmetryMode?: "auto" | "on" | "off";
    topology?: "tris" | "quads";
    targetPolycount?: number;
  }
): Promise<string> {
  const res = await fetch(`${MESHY_API_URL}/openapi/v2/image-to-3d`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MESHY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_url: imageUrl,
      enable_pbr: options?.enablePbr ?? true,
      surface_mode: options?.surfaceMode ?? "soft",
      symmetry_mode: options?.symmetryMode ?? "auto",
      topology: options?.topology ?? "tris",
      target_polycount: options?.targetPolycount ?? 30000,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meshy API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  // Response: { "result": "task_id" }
  return data.result as string;
}

/**
 * Poll task status by ID.
 */
export async function getMeshyTask(taskId: string): Promise<MeshyTask> {
  const res = await fetch(
    `${MESHY_API_URL}/openapi/v2/image-to-3d/${taskId}`,
    {
      headers: { Authorization: `Bearer ${MESHY_API_KEY}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meshy API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<MeshyTask>;
}
