const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const target = 'function renderResults(results, isLoading = false) {';
const fix = 'function renderResults(results, isLoading = false) {\n' +
'  if (currentProduct) {\n' +
'    currentProductEl.innerHTML = generateCardHtml(currentProduct, true);\n' +
'    currentProductEl.classList.remove("hidden");\n' +
'  } else {\n' +
'    currentProductEl.classList.add("hidden");\n' +
'  }\n';

js = js.replace(target, fix);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Fixed JS!");
