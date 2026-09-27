const fs = require('fs');

// Update HTML
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');
html = html.replace('<div class="loading-title">داریم می‌گردیم...</div>', '<div class="loading-title">در حال جستجو...</div>');
html = html.replace('\n      <div class="loading-subtitle">قیمت‌ها رو از فروشگاه‌های مختلف بررسی می‌کنیم.</div>', '');
fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Updated HTML");

// Update CSS - shrink title from 15px to 13px
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');
css = css.replace('.loading-title {\n  font-size: 15px;', '.loading-title {\n  font-size: 13px;');
fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated CSS");
