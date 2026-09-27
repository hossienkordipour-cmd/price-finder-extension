const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

js = js.replace(/document\.getElementById\("manual-search-form"\)\.addEventListener/g, 
                'document.getElementById("manual-search-form")?.addEventListener');

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Safe guarded manual search listeners");
