const fs = require('fs');
let code = fs.readFileSync('background.js', 'utf8');

const target = 'const isUsed = r.condition === "used" || ["دیوار", "شیپور"].includes(r.store);';
const replacement = 'if (r.availability === false) return null;\n    const isUsed = r.condition === "used" || ["دیوار", "شیپور"].includes(r.store);';

if (code.includes(target) && !code.includes('r.availability === false')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('background.js', code);
  console.log("Global out of stock filter added.");
}
