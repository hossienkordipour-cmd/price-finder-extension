const fs = require('fs');
let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace('.result-card {\n  display: flex;', '.result-card {\n  display: flex;\n  gap: 8px;');
css = css.replace('.skeleton-card {\n  display: flex;', '.skeleton-card {\n  display: flex;\n  gap: 8px;');

fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Replaced");
