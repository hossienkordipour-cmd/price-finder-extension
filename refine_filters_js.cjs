const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

js = js.replace('countEl.innerText = filtered.length.toLocaleString("fa-IR") + " محصول";', 
                'countEl.innerText = (isLoading && filtered.length === 0) ? "..." : filtered.length.toLocaleString("fa-IR") + " محصول";');

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Refined JS loading state");
