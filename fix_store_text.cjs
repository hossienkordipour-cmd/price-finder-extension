const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

js = js.replace('const storeText = item.condition === "used" ? `${item.store} - دست دوم` : `${item.store} - نو`;', 
                'const storeText = item.condition === "used" ? `${item.store} - کارکرده` : item.store;');

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated store text logic");
