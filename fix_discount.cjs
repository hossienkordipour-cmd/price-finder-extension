const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');
js = js.replace('٪${diff.toLocaleString("fa-IR")} ارزان تر', '${diff.toLocaleString("fa-IR")}٪ ارزان تر');
fs.writeFileSync('sidebar/sidebar.js', js);
