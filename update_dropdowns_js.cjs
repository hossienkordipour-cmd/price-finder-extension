const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

// Update value accessors in renderResults
js = js.replace('const cond = conditionFilter.value;', 'const cond = conditionFilter.dataset.value;');
js = js.replace('const sort = sortFilter.value;', 'const sort = sortFilter.dataset.value;');

// Replace the old event listeners:
// [sortFilter, conditionFilter].forEach(el => {
//   el.addEventListener("change", () => renderResults(allResults, false));
// });

const oldListeners = `[sortFilter, conditionFilter].forEach(el => {
  el.addEventListener("change", () => renderResults(allResults, false));
});`;

const newListeners = `// Custom dropdown logic
document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
  const header = dropdown.querySelector('.dropdown-header');
  const list = dropdown.querySelector('.dropdown-list');
  const items = dropdown.querySelectorAll('.dropdown-item');

  header.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.dropdown-list').forEach(l => {
      if (l !== list) l.classList.add('hidden');
    });
    list.classList.toggle('hidden');
  });

  items.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.dataset.value = item.dataset.value;
      header.innerHTML = item.innerHTML;
      
      items.forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      
      list.classList.add('hidden');
      renderResults(allResults, false);
    });
  });
});

document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown-list').forEach(l => l.classList.add('hidden'));
});`;

js = js.replace(oldListeners, newListeners);

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated JS for custom dropdowns");
