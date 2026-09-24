import { API_BASE_URL } from "./config";

export type ConnectedAccount = { id: string; name: string; email: string };

/**
 * Verifies a personal access token against the web app's
 * `/api/extension/me` route (P2-6) — the concrete proof that this
 * extension authenticates via a token, not shared session cookies (FR-16):
 * this `fetch` never sets `credentials: "include"`, so no cookie is ever
 * sent even if one happened to exist for this origin.
 *
 * Returns the connected account on success, or `null` for any failure
 * (invalid/expired/revoked token, network error) — callers only need to
 * distinguish "connected" from "not connected", not the specific reason,
 * for the UI this backs (options page "test connection", popup status).
 */
export async function verifyToken(
  token: string
): Promise<ConnectedAccount | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/extension/me`, {
      method: "GET",
      headers: { "x-api-key": token },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { user: ConnectedAccount };
    return data.user;
  } catch {
    return null;
  }
}
