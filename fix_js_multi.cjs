const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

// Replace custom dropdown event logic
const oldListeners = `document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
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
});`;

const newListeners = `document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
  const header = dropdown.querySelector('.dropdown-header');
  const list = dropdown.querySelector('.dropdown-list');
  const items = dropdown.querySelectorAll('.dropdown-item');
  const isMulti = dropdown.classList.contains('multiple');
  const clearBtn = dropdown.querySelector('.clear-filter');
  const headerText = dropdown.querySelector('.header-text');
  
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      items.forEach(i => i.classList.add('selected')); // all selected
      headerText.innerText = 'وضعیت کالا';
      clearBtn.classList.add('hidden');
      renderResults(allResults, false);
    });
  }

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
      
      if (!isMulti) {
        dropdown.dataset.value = item.dataset.value;
        header.innerHTML = item.innerHTML;
        items.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        list.classList.add('hidden');
      } else {
        item.classList.toggle('selected');
        
        // Prevent deselecting both (if user tries to deselect the last one, block it)
        const selectedItems = Array.from(items).filter(i => i.classList.contains('selected'));
        if (selectedItems.length === 0) {
          item.classList.add('selected');
          return;
        }
        
        if (selectedItems.length === 1) {
          const valText = selectedItems[0].querySelector('span').innerText;
          headerText.innerText = 'وضعیت کالا: ' + valText;
          clearBtn.classList.remove('hidden');
        } else {
          headerText.innerText = 'وضعیت کالا';
          clearBtn.classList.add('hidden');
        }
      }
      
      renderResults(allResults, false);
    });
  });
});`;

js = js.replace(oldListeners, newListeners);

// Replace filter logic inside renderResults
const oldFilter = `  const cond = conditionFilter.dataset.value;
  if (cond === "new") filtered = filtered.filter(r => r.condition !== "used");
  if (cond === "used") filtered = filtered.filter(r => r.condition === "used");`;

const newFilter = `  const condItems = Array.from(document.querySelectorAll('#condition-filter .dropdown-item.selected')).map(i => i.dataset.value);
  if (!condItems.includes("new")) filtered = filtered.filter(r => r.condition === "used");
  if (!condItems.includes("used")) filtered = filtered.filter(r => r.condition !== "used");`;

js = js.replace(oldFilter, newFilter);

fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated JS for multi-select dropdown");
