const fs = require('fs');

let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');
const fontFaces = "@font-face { font-family: 'Yekan Bakh'; src: url('YekanBakhFaNum-Regular.woff2') format('woff2'); font-weight: normal; }\n" +
"@font-face { font-family: 'Yekan Bakh'; src: url('YekanBakhFaNum-SemiBold.woff2') format('woff2'); font-weight: 600; }\n" +
"@font-face { font-family: 'Yekan Bakh'; src: url('YekanBakhFaNum-Bold.woff2') format('woff2'); font-weight: bold; }\n" +
"@font-face { font-family: 'Yekan Bakh'; src: url('YekanBakhFaNum-ExtraBold.woff2') format('woff2'); font-weight: 800; }\n";

if (!css.includes('YekanBakhFaNum-Regular.woff2')) {
  css = fontFaces + css;
  css = css.replace(/font-family: system-ui[^;]+;/g, "font-family: 'Yekan Bakh', system-ui, sans-serif;");
  fs.writeFileSync('sidebar/sidebar.css', css);
  console.log("Fixed CSS font");
}

let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');
const oldStr = 'chrome.runtime.sendMessage({ type: "GET_TAB_STATE" }, (response) => {\n  if (response && response.tabId) {\n    currentTabId = response.tabId;\n  }\n});';

const newStr = 'chrome.runtime.sendMessage({ type: "GET_TAB_STATE" }, (response) => {\n' +
'  if (chrome.runtime.lastError || !response) return;\n' +
'  if (response.tabId) currentTabId = response.tabId;\n' +
'  const state = response.state;\n' +
'  if (state && state.currentProduct) {\n' +
'    latestRequestId = state.requestId || 0;\n' +
'    currentProduct = state.currentProduct;\n' +
'    if (state.isLoading) {\n' +
'      showLoading();\n' +
'      if (state.searchResults && state.searchResults.length > 0) {\n' +
'        allResults = state.searchResults;\n' +
'        renderResults(allResults, true);\n' +
'      }\n' +
'    } else if (state.searchResults && state.searchResults.length > 0) {\n' +
'      allResults = state.searchResults;\n' +
'      renderResults(allResults, false);\n' +
'    } else {\n' +
'      showLoading();\n' +
'      chrome.runtime.sendMessage({ type: "START_SEARCH", tabId: currentTabId, product: currentProduct });\n' +
'    }\n' +
'  }\n' +
'});';

if (js.includes('if (response && response.tabId) {')) {
  js = js.replace(oldStr, newStr);
  fs.writeFileSync('sidebar/sidebar.js', js);
  console.log("Fixed JS initialization");
} else {
  console.log("oldStr not found");
}
