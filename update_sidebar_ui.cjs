const fs = require('fs');

let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');
if (html.includes('<span class="store-tag">دیجی‌پی</span>')) {
  html = html.replace('<span class="store-tag">دیجی‌پی</span>', '');
  fs.writeFileSync('sidebar/sidebar.html', html);
  console.log("Removed Digipay tag from sidebar.html");
}

let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');
if (js.includes('if (storeName.includes("دیجی‌پی")) return "digipay";')) {
  js = js.replace('if (storeName.includes("دیجی‌پی")) return "digipay";', '');
  fs.writeFileSync('sidebar/sidebar.js', js);
  console.log("Removed Digipay class from sidebar.js");
}
