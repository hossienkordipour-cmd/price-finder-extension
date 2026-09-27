const fs = require('fs');

let code = fs.readFileSync('background.js', 'utf8');

// I need to replace:
// const storeDomain = linkMatch ? linkMatch[2] : '';
// and
// store: storeDomain.split('.')[0],
// with the new Persian name logic.

const digipayFuncRegex = /async function searchDigipay[^]*?return results;[^]*?catch \(e\) {[^]*?return \[\];[^]*?}/;

const match = code.match(digipayFuncRegex);
if (match) {
  let func = match[0];
  
  // Remove the old store logic
  func = func.replace(/const storeDomain = linkMatch \? linkMatch\[2\] : '';/, 
    `const storeDomain = linkMatch ? linkMatch[2] : '';\n      \n      const logoSnippetMatch = block.match(/class="store-logo([^]*?)<\\/div>/i);\n      let storeFa = '';\n      if (logoSnippetMatch) {\n        const altMatch = logoSnippetMatch[1].match(/alt=(?:"([^"]+)"|([^\\r\\n]+))/i);\n        if (altMatch) storeFa = (altMatch[1] || altMatch[2]).trim();\n      }`);
    
  func = func.replace(/store: storeDomain\.split\('\.'\)\[0\],/, `store: storeFa || storeDomain.split('.')[0],`);
  
  code = code.replace(digipayFuncRegex, func);
  fs.writeFileSync('background.js', code);
  console.log("Updated Digipay to use Persian store names!");
} else {
  console.log("Could not find searchDigipay function");
}
