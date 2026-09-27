const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const fallbackSvg = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d1d5db' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";

js = js.replace(/https:\/\/via\.placeholder\.com\/150/g, fallbackSvg);

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated sidebar image fallback");
