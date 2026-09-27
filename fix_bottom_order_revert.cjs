const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

js = js.replace('<div class="card-price"><span>تومان</span> ${formatPrice(item.price)}</div>', 
                '<div class="card-price">${formatPrice(item.price)} <span>تومان</span></div>');

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Reverted card-price inner order");
