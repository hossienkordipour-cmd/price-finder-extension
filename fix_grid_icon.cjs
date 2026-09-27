const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const oldLogic = `document.querySelector(".grid-icon-btn").addEventListener("click", () => {
  resultsListEl.classList.toggle("grid-view");
});`;

const newLogic = `const gridIconBtn = document.querySelector(".grid-icon-btn");
const gridSvg = \`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>\`;
const listSvg = \`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="6" rx="1"></rect><rect x="3" y="14" width="18" height="6" rx="1"></rect></svg>\`;

gridIconBtn.addEventListener("click", () => {
  const isGrid = resultsListEl.classList.toggle("grid-view");
  gridIconBtn.innerHTML = isGrid ? listSvg : gridSvg;
});`;

js = js.replace(oldLogic, newLogic);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated toggle icon logic");
