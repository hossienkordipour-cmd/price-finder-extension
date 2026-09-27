const fs = require('fs');

let code = fs.readFileSync('background.js', 'utf8');

const target = `const isAvailable = item.stock_status === "موجود" || parseInt(item.quantity) > 0;`;
const replacement = `const isAvailable = item.stock_status === "موجود" || parseInt(item.quantity) > 0;\n      if (!isAvailable) continue;`;

if (code.includes(target) && !code.includes('if (!isAvailable) continue;')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('background.js', code);
  console.log("MasterKala out of stock items will now be skipped.");
} else {
  console.log("Already skipped or target not found");
}
