const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const newRender = `function renderResults(results, isLoading = false) {
  if (currentProduct) {
    currentProductEl.innerHTML = generateCardHtml(currentProduct, true);
    currentProductEl.classList.remove("hidden");
  } else {
    currentProductEl.classList.add("hidden");
  }

  emptyState.classList.add("hidden");
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");
  resultsState.classList.remove("hidden");

  let filtered = [...results];
  const cond = conditionFilter.value;
  if (cond === "new") filtered = filtered.filter(r => r.condition !== "used");
  if (cond === "used") filtered = filtered.filter(r => r.condition === "used");

  const sort = sortFilter.value;
  if (sort === "cheap") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === "match") {
    filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }

  // Update results count
  const countEl = document.getElementById("results-count");
  if (countEl) {
    countEl.innerText = filtered.length.toLocaleString("fa-IR") + " محصول";
  }

  let html = filtered.map(r => generateCardHtml(r, false)).join("");`;

// Just replace everything up to let html = filtered.map
const parts = js.split('let html = filtered.map(r => generateCardHtml(r, false)).join("");');
if (parts.length === 2) {
  const topPart = parts[0];
  const indexToReplace = topPart.indexOf('function renderResults(results, isLoading = false) {');
  
  const beforeRender = topPart.substring(0, indexToReplace);
  
  js = beforeRender + newRender + '\n  let html = filtered.map(r => generateCardHtml(r, false)).join("");' + parts[1];
  
  fs.writeFileSync('sidebar/sidebar.js', js);
  console.log("Updated JS logic for results-count");
} else {
  console.log("Could not split JS properly");
}
