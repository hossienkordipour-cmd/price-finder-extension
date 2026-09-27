const fs = require('fs');
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');

html = html.replace('width="66" height="32"', 'width="50" height="24" style="object-fit: contain;"');

fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Logo size reduced");
