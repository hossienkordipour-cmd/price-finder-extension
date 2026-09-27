const fs = require('fs');

let code = fs.readFileSync('background.js', 'utf8');

const target = '{ name: "شیپور", p: searchSheypoor(searchName) },';
const replacement = target + '\n    { name: "مسترکالا", p: searchMasterKala(searchName) },\n    { name: "دیجی‌پی", p: searchDigipay(searchName) },';

if (code.includes(target) && !code.includes('searchMasterKala(searchName)')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('background.js', code);
  console.log("Promises fixed!");
} else {
  console.log("Already fixed or target not found");
}
