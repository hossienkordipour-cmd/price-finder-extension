const fs = require('fs');
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');

if (!html.includes('مسترکالا')) {
  html = html.replace(
    '<span class="store-tag">دیوار</span>',
    '<span class="store-tag">دیوار</span>\n        <span class="store-tag">مسترکالا</span>'
  );
  fs.writeFileSync('sidebar/sidebar.html', html);
  console.log("Masterkala UI added");
}
