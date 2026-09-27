const fs = require('fs');
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');

html = html.replace('<div id="results-list"></div>', '<div id="results-list" class="results-list"></div>');

fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Added results-list class to HTML");
