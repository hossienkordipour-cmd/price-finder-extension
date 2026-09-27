const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const oldSetting = 'resultsListEl.innerHTML = html;\n}';
const newSetting = `resultsListEl.innerHTML = html;
  
  const clearBtn = document.getElementById('btn-clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      // Reset Sort
      const sortDropdown = document.getElementById('sort-filter');
      sortDropdown.dataset.value = 'cheap';
      sortDropdown.querySelector('.header-text') ? sortDropdown.querySelector('.header-text').innerText = 'ارزان ترین' : sortDropdown.querySelector('.dropdown-header').innerText = 'ارزان ترین';
      sortDropdown.querySelectorAll('.dropdown-item').forEach(i => {
        i.classList.remove('selected');
        if (i.dataset.value === 'cheap') i.classList.add('selected');
      });

      // Reset Condition
      const condDropdown = document.getElementById('condition-filter');
      condDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.add('selected'));
      const condClearBtn = condDropdown.querySelector('.clear-filter');
      if (condClearBtn) condClearBtn.classList.add('hidden');
      const condHeaderText = condDropdown.querySelector('.header-text');
      if (condHeaderText) condHeaderText.innerText = 'وضعیت کالا';
      
      renderResults(allResults, false);
    });
  }
}`;

js = js.replace(oldSetting, newSetting);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Added event listener binding for clear filters button");
