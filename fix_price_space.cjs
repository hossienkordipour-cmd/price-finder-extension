const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

js = js.replace('<div class="card-price">${formatPrice(item.price)} <span>تومان</span></div>', 
                '<div class="card-price">${formatPrice(item.price)}<span>تومان</span></div>');

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Removed space from JS HTML string");
