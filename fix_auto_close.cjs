const fs = require('fs');
let js = fs.readFileSync('content/content.js', 'utf8');

const oldCode = `    if (product && product.name) {
      const currentKey = product.name + (product.price || '');
      if (lastDetectedKey !== currentKey) {
        lastDetectedKey = currentKey;
        chrome.runtime.sendMessage({ type: "PRODUCT_DETECTED", product, url: location.href });
        
        // Just make sure widget is injected if it was somehow removed
        injectFloatingButton();
      }
    } else {
      // Not a product page anymore (SPA navigation to home page, etc.)
      removePiqoUI();
    }`;

const newCode = `    if (product && product.name) {
      const currentKey = product.name + (product.price || '');
      if (lastDetectedKey !== currentKey) {
        lastDetectedKey = currentKey;
        chrome.runtime.sendMessage({ type: "PRODUCT_DETECTED", product, url: location.href });
        
        // Just make sure widget is injected if it was somehow removed
        injectFloatingButton();
      }
    } else {
      // Not a product page anymore (SPA navigation to home page, etc.)
      // Only remove UI if we PREVIOUSLY had a product on this page, to avoid 
      // destroying manually opened popups on non-shopping sites during initial polling.
      if (lastDetectedKey !== null) {
        removePiqoUI();
      }
    }`;

js = js.replace(oldCode, newCode);
fs.writeFileSync('content/content.js', js);
console.log("Fixed auto-close issue");
