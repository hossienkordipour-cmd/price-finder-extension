const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

js = js.replace('let html = filtered.map(r => generateCardHtml(r, false)).join("");\n  let html = filtered.map(r => generateCardHtml(r, false)).join("");', 
                'let html = filtered.map(r => generateCardHtml(r, false)).join("");');

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Fixed SyntaxError");
