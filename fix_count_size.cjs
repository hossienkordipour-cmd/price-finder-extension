const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.results-count {\n  font-size: 13px;', 
                  '.results-count {\n  font-size: 12px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Changed results-count font size to 12px");
