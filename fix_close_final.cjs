const fs = require('fs');
let js = fs.readFileSync('content/content.js', 'utf8');

const regex = /\} else \{\s*\/\/\s*Not a product page anymore[^\}]*removePiqoUI\(\);\s*\}/g;
js = js.replace(regex, `} else {
      // Not a product page anymore (SPA navigation to home page, etc.)
      // Only remove if the floating widget is present (which means a product was previously detected).
      if (document.getElementById('piqo-widget-container')) {
        removePiqoUI();
      }
    }`);

fs.writeFileSync('content/content.js', js);
console.log("Fixed removePiqoUI logic");
