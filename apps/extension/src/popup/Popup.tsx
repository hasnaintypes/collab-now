// Stub popup UI. Real behavior per PRD.md §6.11:
// detect the active tab's URL/content type and offer one-click "Generate
// notes", authenticated via a personal access token (not shared cookies).

export default function Popup() {
  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>CollabNow</h1>
      <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
        This extension is a placeholder. Note generation from YouTube/article
        pages is not implemented yet.
      </p>
      <button
        disabled
        style={{
          marginTop: 12,
          width: "100%",
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "not-allowed",
          opacity: 0.5,
        }}
      >
        Generate notes (coming soon)
      </button>
    </div>
  );
}
