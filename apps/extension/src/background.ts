// MV3 service worker. P2-6 (this issue) only needs the popup/options pages
// — tab detection and PAT auth both happen there directly, with no
// background messaging required yet. P2-7 will extend this worker to relay
// "generate notes" requests to the CollabNow ingestion API and poll job
// status (queued -> processing -> ready/failed) so status updates keep
// flowing even if the popup gets closed mid-job.

chrome.runtime.onInstalled.addListener(() => {
  // eslint-disable-next-line no-console
  console.log("[collabnow-extension] installed");
});
