const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_CONFIGURED =
  url.length > 0 &&
  !url.includes("placeholder") &&
  !url.includes("your-project");
