const fs = require('fs');

let css = fs.readFileSync('sidebar/sidebar.css', 'utf8');

css = css.replace(/display: -webkit-box;[\s\S]*?-webkit-line-clamp: 2;[\s\S]*?-webkit-box-orient: vertical;[\s\S]*?overflow: hidden;/g, "white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  display: block;");
fs.writeFileSync('sidebar/sidebar.css', css);
console.log("Fixed CSS: 1-line title");

let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const target = 'function renderResults(results, isLoading = false) {';
const fix = 'function renderResults(results, isLoading = false) {\n' +
'  if (currentProduct) {\n' +
'    currentProductEl.innerHTML = generateCardHtml(currentProduct, true);\n' +
'    currentProductEl.classList.remove("hidden");\n' +
'  } else {\n' +
'    currentProductEl.classList.add("hidden");\n' +
'  }\n';

if (js.includes(target) && !js.includes('currentProductEl.innerHTML = generateCardHtml(currentProduct, true);')) {
  js = js.replace(target, fix);
  fs.writeFileSync('sidebar/sidebar.js', js);
  console.log("Fixed JS: Base product rendering");
} else {
  console.log("JS already fixed or target not found");
}

