const fs = require('fs');

// Add to HTML
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');
if (!html.includes('دیجی‌پی')) {
  html = html.replace(
    '<span class="store-tag">مسترکالا</span>',
    '<span class="store-tag">مسترکالا</span>\n        <span class="store-tag">دیجی‌پی</span>'
  );
  fs.writeFileSync('sidebar/sidebar.html', html);
  console.log("Digipay HTML UI added");
}

// Add to JS
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');
if (!js.includes('return "digipay"')) {
  js = js.replace(
    'if (storeName === "مسترکالا") return "masterkala";',
    'if (storeName === "مسترکالا") return "masterkala";\n  if (storeName.includes("دیجی‌پی")) return "digipay";'
  );
  fs.writeFileSync('sidebar/sidebar.js', js);
  console.log("Digipay getStoreClass updated");
}
