const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.card-title {\n  font-size: 12px;', '.card-title {\n  font-size: 14px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Title font size changed to 14px");
