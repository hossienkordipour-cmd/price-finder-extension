const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.card-price span {\n  font-size: 10px;\n  font-weight: 400;\n  color: #909090;\n  margin-right: 2px;', 
                  '.card-price span {\n  font-size: 10px;\n  font-weight: 400;\n  color: #909090;\n  margin-right: 4px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Card price span margin changed to 4px");
