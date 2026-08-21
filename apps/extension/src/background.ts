// Stub MV3 service worker. Real behavior per PRD.md §6.11: relay
// "generate notes" requests from the popup/content-script to the CollabNow
// ingestion API and track job status (queued -> processing -> ready/failed).

chrome.runtime.onInstalled.addListener(() => {
  // eslint-disable-next-line no-console
  console.log("[collabnow-extension] installed (stub, no-op)");
});
