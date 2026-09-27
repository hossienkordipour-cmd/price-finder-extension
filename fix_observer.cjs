const fs = require('fs');
let js = fs.readFileSync('content/content.js', 'utf8');

js = js.replace(/removePiqoUI\(\);\s*\/\/\s*Clear UI for the new page/g, `if (document.getElementById('piqo-widget-container')) {
        removePiqoUI(); // Only clear if widget was present
      }`);

fs.writeFileSync('content/content.js', js);
console.log("Fixed MutationObserver auto-close");
