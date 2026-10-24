import type { PaidPlanId } from "../types";

/**
 * All read here are `NEXT_PUBLIC_` — Paddle.js runs entirely in the browser
 * (P3-2) and needs its client-side token, environment, and price IDs to open
 * the checkout overlay. None of these are secrets: the client-side token is
 * deliberately distinct from `PADDLE_API_KEY` (server-only, kept for P3-3's
 * webhook verification and any future server-to-server calls), and a price
 * ID is just a public catalog identifier Paddle's own checkout UI already
 * exposes in its network requests.
 */
export const PADDLE_ENV =
  (process.env.NEXT_PUBLIC_PADDLE_ENV as "sandbox" | "production" | undefined) ??
  "sandbox";

export const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";

export const PADDLE_PRICE_IDS: Record<PaidPlanId, string> = {
  pro: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO ?? "",
  team: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_TEAM ?? "",
};

export const PLAN_LABELS: Record<"free" | PaidPlanId, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
};
