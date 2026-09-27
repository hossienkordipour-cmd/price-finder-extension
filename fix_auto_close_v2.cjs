const fs = require('fs');
let js = fs.readFileSync('content/content.js', 'utf8');

// Fix the MutationObserver to always clear UI on navigation
const oldObserver = `  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      lastDetectedKey = null; // Force reset on navigation
      scheduleDetection();
    }
  });`;

const newObserver = `  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      lastDetectedKey = null; // Force reset on navigation
      removePiqoUI(); // Clear UI for the new page
      scheduleDetection();
    }
  });`;
js = js.replace(oldObserver, newObserver);

// Fix detectProduct to only remove UI if the widget (product badge) is present
const oldElse = `    } else {
      // Not a product page anymore (SPA navigation to home page, etc.)
      // Only remove UI if we PREVIOUSLY had a product on this page, to avoid 
      // destroying manually opened popups on non-shopping sites during initial polling.
      if (lastDetectedKey !== null) {
        removePiqoUI();
      }
    }`;

const newElse = `    } else {
      // Not a product page anymore, but don't destroy manually opened popups.
      // Only remove if the floating widget is present (which means a product was previously detected).
      if (document.getElementById('piqo-widget-container')) {
        removePiqoUI();
      }
    }`;
js = js.replace(oldElse, newElse);

fs.writeFileSync('content/content.js', js);
console.log("Updated auto-close logic");
