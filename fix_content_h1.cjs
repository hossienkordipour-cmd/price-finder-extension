const fs = require('fs');

let code = fs.readFileSync('content/content.js', 'utf8');

// Find the block:
// const h1 = document.querySelector("h1");
// if (h1) name = h1.textContent.trim();
const oldBlock = `const h1 = document.querySelector("h1");
    if (h1) name = h1.textContent.trim();`;

const newBlock = `const h1 = document.querySelector("h1");
    if (h1) {
      // Sometimes H1 has badges like <span>ناموجود</span>شامپو...
      // This causes textContent to return "ناموجودشامپو"
      name = h1.textContent.trim();
      // Remove known problematic badges at the start of the string
      name = name.replace(/^(ناموجود|توقف تولید)\\s*/, '');
    }`;

if (code.includes(oldBlock)) {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync('content/content.js', code);
  console.log("Fixed content.js H1 extraction");
} else {
  console.log("Could not find the exact block");
}
