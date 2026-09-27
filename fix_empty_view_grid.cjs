const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.empty-view {\n  display: flex;', '.empty-view {\n  grid-column: 1 / -1;\n  width: 100%;\n  display: flex;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Added grid-column: 1 / -1 to empty-view");
