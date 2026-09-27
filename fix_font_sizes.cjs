const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

// Title size (first match is the list view, grid view is further down with 11px explicitly set)
css = css.replace('.card-title {\n  font-size: 12px;', '.card-title {\n  font-size: 13px;');

// Store size
css = css.replace('.card-store {\n  font-size: 10px;', '.card-store {\n  font-size: 11px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("List view font sizes adjusted to 13 and 11");
