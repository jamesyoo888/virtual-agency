export type UserRole = "admin" | "client";

export type ModelStatus = "draft" | "active" | "inactive";

export type ProjectStatus =
  | "inquiry"
  | "brief_received"
  | "in_progress"
  | "review"
  | "delivered";

export type ContractTier = "non-exclusive" | "category" | "full";

export type FileType = "concept" | "reference" | "generated" | "3d_mesh";

export type SurfaceType = "matte" | "semi-gloss" | "glossy";

export type IndustryTag =
  | "beauty"
  | "tech"
  | "food"
  | "luxury"
  | "sports"
  | "lifestyle";

export type GenreTag =
  | "ad"
  | "film"
  | "drama"
  | "noir"
  | "romance"
  | "sci-fi"
  | "historical"
  | "indie"
  | "horror";

export type MoodTag = "cold" | "warm" | "neutral" | "edgy";

export interface Model {
  id: string;
  name: string;
  slug: string;
  debut_date: string | null;
  bio: string | null;
  personality: string | null;
  industry_tags: IndustryTag[];
  genre_tags: GenreTag[];
  mood_tags: MoodTag[];
  instagram_handle: string | null;
  follower_count: number;
  base_price: number | null;
  exclusive_price: number | null;
  is_exclusive_available: boolean;
  status: ModelStatus;
  concept_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelFile {
  id: string;
  model_id: string;
  file_type: FileType;
  url: string;
  version: number;
  created_at: string;
}

export interface ModelAgeHistory {
  id: string;
  model_id: string;
  age_value: number;
  visual_description: string | null;
  thumbnail_url: string | null;
  recorded_at: string;
}

export interface Client {
  id: string;
  role: UserRole;
  company: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface ClientProduct {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  dimensions_mm: { w: number; h: number; d: number } | null;
  weight_g: number | null;
  material: string | null;
  surface_type: SurfaceType | null;
  image_urls: string[];
  file_3d_url: string | null;
  is_3d_ready: boolean;
  test_mode: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  model_id: string | null;
  product_id: string | null;
  title: string;
  brief: string | null;
  reference_images: string[];
  status: ProjectStatus;
  invoice_amount: number | null;
  created_at: string;
  updated_at: string;
  model?: Model;
  product?: ClientProduct;
}

export interface Contract {
  id: string;
  client_id: string;
  model_id: string;
  tier: ContractTier;
  category_restriction: string | null;
  start_date: string;
  end_date: string;
  price: number;
  status: "active" | "expired" | "terminated";
  created_at: string;
  model?: Model;
}

export interface GenerationHistory {
  id: string;
  project_id: string | null;
  model_id: string;
  type: "image" | "video";
  prompt: string | null;
  parameters: Record<string, unknown>;
  result_urls: string[];
  consistency_score: number | null;
  created_at: string;
}

export interface InquiryFormData {
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  model_id: string;
  model_name: string;
  is_exclusive: boolean;
  purpose: string;
  budget_range: string;
  message: string;
}

export interface CatalogFilters {
  industry?: IndustryTag;
  genre?: GenreTag;
  mood?: MoodTag;
  price_max?: number;
  follower_min?: number;
  age_max?: number;
  exclusive_only?: boolean;
}
