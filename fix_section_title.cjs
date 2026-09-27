const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.section-title {\n  font-size: 14px;\n  font-weight: 800;', 
                  '.section-title {\n  font-size: 16px;\n  font-weight: 600;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Section title updated to 16px and semi-bold");
