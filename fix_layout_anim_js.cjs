const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const oldLogic = `gridIconBtn.addEventListener("click", () => {
  const isGrid = resultsListEl.classList.toggle("grid-view");
  gridIconBtn.innerHTML = isGrid ? listSvg : gridSvg;
});`;

const newLogic = `gridIconBtn.addEventListener("click", () => {
  resultsListEl.classList.add("switching-layout");
  setTimeout(() => {
    const isGrid = resultsListEl.classList.toggle("grid-view");
    gridIconBtn.innerHTML = isGrid ? listSvg : gridSvg;
    
    // Slight delay before fading back in to ensure DOM is ready
    requestAnimationFrame(() => {
      resultsListEl.classList.remove("switching-layout");
    });
  }, 150);
});`;

js = js.replace(oldLogic, newLogic);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated layout toggle logic to support animation");
