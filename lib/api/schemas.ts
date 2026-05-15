import { z } from "zod";

const INDUSTRY = ["beauty", "tech", "food", "luxury", "sports", "lifestyle"] as const;
const GENRE = ["ad", "film", "drama", "noir", "romance", "sci-fi", "historical", "indie", "horror"] as const;
const MOOD = ["cold", "warm", "neutral", "edgy"] as const;

// Accept either the wizard form or the canonical names.
export const modelCreateSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(120),
  debut_date: z.string().nullish(),
  bio: z.string().nullish(),
  personality: z.string().nullish(),
  personality_tone: z.string().nullish(),
  industry_tags: z.array(z.enum(INDUSTRY)).optional(),
  genre_tags: z.array(z.enum(GENRE)).optional(),
  mood_tags: z.array(z.enum(MOOD)).optional(),
  instagram_handle: z.string().nullish(),
  base_price: z.number().int().nonnegative().nullish(),
  exclusive_price: z.number().int().nonnegative().nullish(),
  base_rate: z.number().int().nonnegative().nullish(),
  exclusive_rate: z.number().int().nonnegative().nullish(),
  is_exclusive_available: z.boolean().optional(),
  concept_image: z.string().nullish(),
  angle_images: z.record(z.string(), z.string().nullable()).optional(),
  final_images: z.array(z.string()).optional(),
});

export type ModelCreateInput = z.infer<typeof modelCreateSchema>;

export const modelPatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  debut_date: z.string().nullish(),
  bio: z.string().nullish(),
  personality: z.string().nullish(),
  industry_tags: z.array(z.enum(INDUSTRY)).optional(),
  genre_tags: z.array(z.enum(GENRE)).optional(),
  mood_tags: z.array(z.enum(MOOD)).optional(),
  instagram_handle: z.string().nullish(),
  base_price: z.number().int().nonnegative().nullish(),
  exclusive_price: z.number().int().nonnegative().nullish(),
  is_exclusive_available: z.boolean().optional(),
  status: z.enum(["draft", "active", "inactive"]).optional(),
  concept_image: z.string().nullish(),
  angle_images: z.record(z.string(), z.string().nullable()).optional(),
  final_images: z.array(z.string()).optional(),
});

export type ModelPatchInput = z.infer<typeof modelPatchSchema>;

export const generateImageSchema = z.object({
  prompt: z.string().trim().min(1, "prompt is required").max(2000),
  count: z.number().int().min(1).max(8).optional(),
  negative_prompt: z.string().max(2000).optional(),
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;

const httpOrDataUrl = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine(
      (s) => s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:"),
      { message: `${label} must be http(s) or data URL` }
    );

export const meshyCreateSchema = z.object({
  imageUrl: httpOrDataUrl("imageUrl"),
});

export type MeshyCreateInput = z.infer<typeof meshyCreateSchema>;

export const videoCreateSchema = z.object({
  imageUrl: httpOrDataUrl("imageUrl"),
  prompt: z.string().trim().min(1, "prompt is required").max(2000),
  negativePrompt: z.string().max(2000).optional(),
  durationSec: z.union([z.literal(5), z.literal(10)]).optional(),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional(),
});

export type VideoCreateInput = z.infer<typeof videoCreateSchema>;

export const lipsyncCreateSchema = z.object({
  videoUrl: httpOrDataUrl("videoUrl"),
  audioUrl: httpOrDataUrl("audioUrl"),
});

export type LipsyncCreateInput = z.infer<typeof lipsyncCreateSchema>;

// Settings — cost caps. null clears the cap (= unlimited).
const capValue = z
  .union([z.number().positive(), z.null()])
  .or(z.literal("").transform(() => null));

export const capsPatchSchema = z.object({
  perCall: capValue.optional(),
  daily: capValue.optional(),
  weekly: capValue.optional(),
  monthly: capValue.optional(),
});

export type CapsPatchInput = z.infer<typeof capsPatchSchema>;

// Client inquiry submission. `brief` already includes the pre-formatted
// purpose/budget line from the form — keep the API permissive but capped.
export const inquiryCreateSchema = z.object({
  model_id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  brief: z.string().max(5000).optional().nullable(),
  budget_range: z.string().max(50).optional().nullable(),
  purpose: z.string().max(50).optional().nullable(),
});

export type InquiryCreateInput = z.infer<typeof inquiryCreateSchema>;

// Bulk status change for projects — admin Inbox can sweep many at once.
export const projectBulkStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  status: z.enum([
    "inquiry",
    "brief_received",
    "in_progress",
    "review",
    "delivered",
  ]),
});

export type ProjectBulkStatusInput = z.infer<typeof projectBulkStatusSchema>;

// Reviews — client submits a 1-5 rating, optional comment. Comment cap of 2k
// is generous but bounds an abusive client; admin moderates anything that
// slips through length checks.
export const reviewCreateSchema = z.object({
  project_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
});

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;

export const reviewModerateSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().trim().max(500).optional().nullable(),
});

export type ReviewModerateInput = z.infer<typeof reviewModerateSchema>;

// Bulk status change for /api/admin/models/bulk-status — cap the batch size
// so a runaway client can't ask the DB to update tens of thousands of rows
// in a single request.
export const modelBulkStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  status: z.enum(["draft", "active", "inactive"]),
});

export type ModelBulkStatusInput = z.infer<typeof modelBulkStatusSchema>;
