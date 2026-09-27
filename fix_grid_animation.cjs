const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const oldCode = `gridIconBtn.addEventListener("click", () => {
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

const newCode = `gridIconBtn.addEventListener("click", () => {
  // Disable animation if empty state is showing
  if (resultsListEl.querySelector('.empty-view')) {
    const isGrid = resultsListEl.classList.toggle("grid-view");
    gridIconBtn.innerHTML = isGrid ? listSvg : gridSvg;
    return;
  }

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

js = js.replace(oldCode, newCode);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Fixed grid animation on empty view");
