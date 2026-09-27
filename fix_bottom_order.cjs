const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

js = js.replace('<div class="card-bottom">\n        ${discountHtml}\n        <div class="card-price">${formatPrice(item.price)} <span>تومان</span></div>\n      </div>', 
                '<div class="card-bottom">\n        <div class="card-price"><span>تومان</span> ${formatPrice(item.price)}</div>\n        ${discountHtml}\n      </div>');

// Wait! Notice the Toman position. In the image: "تومان" is to the right of the price?
// Let's re-read the image: "۵۰٪ ارزان تر" is on the left. "تومان ۲۸۸,۰۰۰" is on the right.
// It literally looks like "تومان 288,000". Wait, let me zoom in on the image.
// Right side of the bottom section: "تومان ۲۸۸,۰۰۰". 
// "تومان" is on the right of the number, or left of the number? 
// The image says: "تومان ۲۸۸,۰۰۰" where "تومان" is on the far right!
// Wait! If "تومان" is on the right of the number, it's `<span>تومان</span> ${formatPrice(item.price)}`.
// In RTL, text flows right to left. So "تومان" (right) then "۲۸۸,۰۰۰" (left).
// Let's make sure.

js = js.replace('<div class="card-bottom">\n        ${discountHtml}\n        <div class="card-price">${formatPrice(item.price)} <span>تومان</span></div>\n      </div>', 
                '<div class="card-bottom">\n        <div class="card-price"><span>تومان</span> ${formatPrice(item.price)}</div>\n        ${discountHtml}\n      </div>');

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Fixed RTL order in card-bottom");
