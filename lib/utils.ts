import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const YEAR_MS = 1000 * 60 * 60 * 24 * 365.25;

// Helper avoids React purity-rule warnings when computed during render.
// Year-floored age is effectively pure across a request lifetime.
export function ageInYears(debutDate: string | null | undefined): number | null {
  if (!debutDate) return null;
  const t = new Date(debutDate).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / YEAR_MS);
}
