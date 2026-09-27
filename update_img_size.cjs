const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');
css = css.replace('.empty-illustration {\n  width: 160px;', '.empty-illustration {\n  width: 120px;');
fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Updated illustration size");
