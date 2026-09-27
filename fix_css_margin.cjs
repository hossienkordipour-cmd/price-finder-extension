const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('margin-right: 2px;', 'margin-left: 4px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Fixed margin on span");
