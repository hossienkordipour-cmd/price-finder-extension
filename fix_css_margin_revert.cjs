const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('margin-left: 4px;', 'margin-right: 4px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Reverted margin on span");
