const fs = require('fs');
let js = fs.readFileSync('background.js', 'utf8');

js = js.replace(
  `chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_POPUP" }).catch(() => {});
});`,
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
});`
);

fs.writeFileSync('background.js', js);
console.log("Added popup window fallback to background.js");
