const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.card-content {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  padding-top: 4px;', 
                  '.card-content {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  padding-top: 0;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Card content top padding changed to 0");
