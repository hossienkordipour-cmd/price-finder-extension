const fs = require('fs');
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');

const oldHtml = `<div class="filters-group">
        <select id="sort-filter" class="pill-select">
          <option value="cheap">ارزان ترین</option>
          <option value="match">دقیق ترین</option>
        </select>
        <select id="condition-filter" class="pill-select">
          <option value="all">وضعیت کالا</option>
          <option value="new">فقط نو</option>
          <option value="used">دست دوم</option>
        </select>
      </div>`;

const newHtml = `<div class="filters-group">
        <div class="custom-dropdown" id="sort-filter" data-value="cheap">
          <div class="dropdown-header">ارزان ترین</div>
          <div class="dropdown-list hidden">
            <div class="dropdown-item selected" data-value="cheap">ارزان ترین</div>
            <div class="dropdown-item" data-value="match">دقیق ترین</div>
          </div>
        </div>
        <div class="custom-dropdown" id="condition-filter" data-value="all">
          <div class="dropdown-header">وضعیت کالا</div>
          <div class="dropdown-list hidden">
            <div class="dropdown-item selected" data-value="all">وضعیت کالا</div>
            <div class="dropdown-item" data-value="new">فقط نو</div>
            <div class="dropdown-item" data-value="used">دست دوم</div>
          </div>
        </div>
      </div>`;

html = html.replace(oldHtml, newHtml);
fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Updated HTML for custom dropdowns");
