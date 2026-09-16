// Shared keyset ("cursor") pagination helpers. Cursors are opaque, base64url-encoded
// `{ createdAt, id }` pairs pointing at the last row of the previous page, used with
// `(createdAt, id)` ORDER BY + WHERE conditions so pagination stays stable even as new
// rows are inserted between page fetches (unlike offset-based pagination).

export type Cursor = {
  createdAt: string;
  id: string;
};

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf-8").toString("base64url");
}

export function decodeCursor(value: string | null | undefined): Cursor | null {
  if (!value) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf-8")
    ) as Partial<Cursor>;
    if (!decoded?.createdAt || !decoded?.id) return null;
    return { createdAt: decoded.createdAt, id: decoded.id };
  } catch {
    return null;
  }
}
