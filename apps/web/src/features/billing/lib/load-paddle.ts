"use client";

import { PADDLE_CLIENT_TOKEN, PADDLE_ENV } from "./paddle-config";

/**
 * Minimal Paddle.js v2 surface this feature actually calls. Loaded via the
 * CDN `<script>` tag below rather than the `@paddle/paddle-js` npm package —
 * this environment has no registry access to add a new dependency, and
 * Paddle's own docs still support plain script-tag integration, so this
 * isn't a workaround so much as the other officially supported path.
 */
/**
 * Only the `transactionId` form — `createCheckoutTransaction`
 * (`../actions/billing.actions.ts`) creates the transaction server-side
 * (price, quantity, `customData.workspaceId`, all set after the server
 * re-verifies the caller's workspace role), so the client never needs to
 * pass raw `items`/`customData` into `Checkout.open()` itself. That's
 * deliberate: an `items`-based open would let a client tamper with
 * `customData.workspaceId` to attribute a checkout to a workspace it
 * doesn't administer.
 */
type PaddleCheckoutOptions = { transactionId: string };

type PaddleInstance = {
  Environment: { set: (env: "sandbox" | "production") => void };
  Initialize: (opts: { token: string }) => void;
  Checkout: { open: (opts: PaddleCheckoutOptions) => void };
};

declare global {
  interface Window {
    Paddle?: PaddleInstance;
  }
}

const PADDLE_SCRIPT_SRC = "https://cdn.paddle.com/paddle/v2/paddle.js";

let paddleLoadPromise: Promise<PaddleInstance> | null = null;

/**
 * Loads Paddle.js once (subsequent calls reuse the same in-flight/settled
 * promise) and initializes it with this app's client-side token/environment.
 * Rejects if `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` isn't set rather than silently
 * opening a checkout that can never complete.
 */
export function loadPaddle(): Promise<PaddleInstance> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Paddle.js can only be loaded in the browser.")
    );
  }

  if (!PADDLE_CLIENT_TOKEN) {
    return Promise.reject(
      new Error(
        "Checkout isn't configured yet — NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is unset."
      )
    );
  }

  if (window.Paddle) {
    return Promise.resolve(window.Paddle);
  }

  if (paddleLoadPromise) {
    return paddleLoadPromise;
  }

  paddleLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PADDLE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (!window.Paddle) {
        paddleLoadPromise = null;
        reject(new Error("Paddle.js loaded but did not attach window.Paddle."));
        return;
      }
      try {
        window.Paddle.Environment.set(PADDLE_ENV);
        window.Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
      } catch (err) {
        // Without this, a bad env/token value thrown synchronously here
        // would never resolve or reject the promise — every future
        // loadPaddle() call would hang forever on the stale pending
        // `paddleLoadPromise`.
        paddleLoadPromise = null;
        reject(err instanceof Error ? err : new Error("Failed to initialize Paddle.js."));
        return;
      }
      resolve(window.Paddle);
    };
    script.onerror = () => {
      paddleLoadPromise = null;
      reject(new Error("Failed to load Paddle.js."));
    };
    document.head.appendChild(script);
  });

  return paddleLoadPromise;
}
