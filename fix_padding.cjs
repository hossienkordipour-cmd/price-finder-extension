const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.card-content {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;', 
                  '.card-content {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  padding-top: 2px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Added 2px top padding");
