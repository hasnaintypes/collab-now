import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Same implementation as apps/web/src/lib/utils/index.ts's cn() — needed
// here for the same reason: Tailwind utilities of equal specificity are
// resolved by CSS source order, not by position within a single
// className string, so a caller's override (e.g. `w-auto` meant to beat
// a component's default `w-full`) can silently lose depending on build
// output order. twMerge resolves the conflict directly instead.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
