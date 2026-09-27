const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

js = js.replace('window.parent.postMessage({ type: "CLOSE_SIDEBAR" }, "*");', 
                'window.parent.postMessage("CLOSE_PIQO_POPUP", "*");');

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Fixed close button message payload");
