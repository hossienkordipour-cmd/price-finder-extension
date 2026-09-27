const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.card-bottom {\n  display: flex;\n  justify-content: space-between;\n  align-items: baseline;\n}', 
                  '.card-bottom {\n  display: flex;\n  justify-content: space-between;\n  align-items: baseline;\n  margin-top: auto;\n}');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Added margin-top: auto to card-bottom");
