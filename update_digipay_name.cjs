const fs = require('fs');
let code = fs.readFileSync('background.js', 'utf8');

const target = "store: \`دیجی‌پی (\${storeDomain.replace('.com','').replace('.ir','')})\`,";
const replacement = "store: storeDomain.split('.')[0],";

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('background.js', code);
  console.log("Updated store name for Digipay");
} else {
  console.log("Target string not found in background.js");
}
