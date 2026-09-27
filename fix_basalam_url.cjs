const fs = require('fs');
let js = fs.readFileSync('background.js', 'utf8');

const oldUrl = 'url: item.absolute_url ? `https://basalam.com${item.absolute_url}` : `https://basalam.com/s?q=${query}`,';
const newUrl = 'url: (item.vendor && item.vendor.identifier && item.id) ? `https://basalam.com/${item.vendor.identifier}/product/${item.id}` : `https://basalam.com/s?q=${query}`,';

js = js.replace(oldUrl, newUrl);
fs.writeFileSync('background.js', js);
console.log("Updated Basalam URL construction");
