// ==============================
// Snapp Shop Bridge Content Script
// این اسکریپت درون صفحه snappshop.ir اجرا میشه
// و از اونجا API call میزنه (بدون 403!)
// ==============================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SNAPPSHOP_SEARCH") {
    const query = encodeURIComponent(message.query);
    const url = `https://apix.snappshop.ir/search/v1?query=${query}&lat=35.6969675&lng=51.4080675`;

    fetch(url, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "Referer": "https://snappshop.ir/",
      }
    })
    .then(res => {
      if (!res.ok) {
        sendResponse({ error: `HTTP ${res.status}` });
        return;
      }
      return res.json();
    })
    .then(data => {
      if (!data) return;
      const items = data?.data?.items || data?.data?.products || data?.products || [];
      sendResponse({ items });
    })
    .catch(err => {
      sendResponse({ error: err.message });
    });

    return true; // Keep channel open for async
  }
});
