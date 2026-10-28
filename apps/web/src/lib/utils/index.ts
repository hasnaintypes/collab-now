import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const parseStringify = (value: unknown) =>
  JSON.parse(JSON.stringify(value));

export const dateConverter = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffInSeconds = diff / 1000;
  const diffInMinutes = diffInSeconds / 60;
  const diffInHours = diffInMinutes / 60;
  const diffInDays = diffInHours / 24;

  switch (true) {
    case diffInDays > 7:
      return `${Math.floor(diffInDays / 7)} weeks ago`;
    case diffInDays >= 1 && diffInDays <= 7:
      return `${Math.floor(diffInDays)} days ago`;
    case diffInHours >= 1:
      return `${Math.floor(diffInHours)} hours ago`;
    case diffInMinutes >= 1:
      return `${Math.floor(diffInMinutes)} minutes ago`;
    default:
      return "Just now";
  }
};

// Previous palette had duplicates (#00CED1, #FFD700, #FF007F each listed
// twice) and was disproportionately green/yellow-green/teal (~60% of its
// 19 entries), which is why every collaborator kept landing on some shade
// of green regardless of the hash — the hash itself wasn't badly
// distributed, the palette it was indexing into was. Rebuilt as one color
// per hue, evenly spread around the wheel (Tailwind's own 500-ish
// shades), with exactly one green.
export const brightColors = [
  "#F43F5E", // rose
  "#EC4899", // pink
  "#D946EF", // fuchsia
  "#A855F7", // purple
  "#8B5CF6", // violet
  "#6366F1", // indigo
  "#3B82F6", // blue
  "#0EA5E9", // sky
  "#06B6D4", // cyan
  "#14B8A6", // teal
  "#10B981", // emerald (the one green)
  "#F59E0B", // amber
  "#F97316", // orange
  "#EF4444", // red
  "#E11D48", // crimson
  "#7C3AED", // deep violet
];

export function getUserColor(userId: string) {
  // djb2 — a plain `sum += charCodeAt(i)` (the previous implementation)
  // clusters statistically for same-length IDs (every Better Auth user id
  // is the same length), which doesn't spread evenly across an index
  // range; this shifts and XORs instead, so it doesn't have that bias.
  let hash = 5381;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 33) ^ userId.charCodeAt(i);
  }
  return brightColors[Math.abs(hash) % brightColors.length];
}
