const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.card-store {\n  font-size: 11px;', '.card-store {\n  font-size: 12px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Store font size changed to 12px");
