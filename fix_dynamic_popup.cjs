const fs = require('fs');
let js = fs.readFileSync('background.js', 'utf8');

// Remove the fallback window creation from onClicked
js = js.replace(
  `chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_POPUP" }).catch(() => {
    // Fallback for chrome:// or webstore pages where content script can't run
    chrome.windows.create({
      url: chrome.runtime.getURL("sidebar/sidebar.html"),
      type: "popup",
      width: 400,
      height: 650,
      focused: true
    });
  });
});`,
  `chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_POPUP" }).catch(() => {});
});`
);

// Add tab update listener to dynamically set the popup on restricted pages
const dynamicPopupCode = `
// Dynamically set popup for restricted pages where content scripts can't run
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url) {
    const isRestricted = tab.url.startsWith('chrome://') || 
                         tab.url.startsWith('edge://') || 
                         tab.url.startsWith('about:') || 
                         tab.url.startsWith('https://chrome.google.com/webstore') ||
                         tab.url.startsWith('https://chromewebstore.google.com');
                         
    if (isRestricted) {
      chrome.action.setPopup({ tabId: tabId, popup: "sidebar/sidebar.html" });
    } else {
      chrome.action.setPopup({ tabId: tabId, popup: "" });
    }
  }
});

chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      const isRestricted = tab.url.startsWith('chrome://') || 
                           tab.url.startsWith('edge://') || 
                           tab.url.startsWith('about:') || 
                           tab.url.startsWith('https://chrome.google.com/webstore') ||
                           tab.url.startsWith('https://chromewebstore.google.com');
      if (isRestricted) {
        chrome.action.setPopup({ tabId: tab.id, popup: "sidebar/sidebar.html" });
      } else {
        chrome.action.setPopup({ tabId: tab.id, popup: "" });
      }
    }
  });
});
`;

js = js + "\n" + dynamicPopupCode;
fs.writeFileSync('background.js', js);
console.log("Added dynamic popup logic");
