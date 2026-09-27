const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');
css = css.replace('.empty-illustration {\n  width: 120px;', '.empty-illustration {\n  width: 160px;');
fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Reverted illustration size to 160px");
