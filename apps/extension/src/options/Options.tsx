// Stub options page. Real behavior per PRD.md §6.11: enter/manage the
// personal access token used to authenticate the extension against the
// CollabNow API (the extension runs in a different origin context than the
// web app, so it cannot rely on shared session cookies).

export default function Options() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 16, fontWeight: 700 }}>CollabNow — Settings</h1>
      <p style={{ fontSize: 13, color: "#666" }}>
        Personal access token management is not implemented yet.
      </p>
    </div>
  );
}
