const fs = require('fs');
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');

const oldHtml = `<div class="filters-row">
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

const newHtml = `<div class="filters-row">
      <div class="filters-group">
        <select id="sort-filter" class="pill-select">
          <option value="cheap">ارزان ترین</option>
          <option value="match">دقیق ترین</option>
        </select>
        <select id="condition-filter" class="pill-select">
          <option value="all">وضعیت کالا</option>
          <option value="new">فقط نو</option>
          <option value="used">دست دوم</option>
        </select>
      </div>
      <div class="results-count" id="results-count">۰ محصول</div>
    </div>`;

html = html.replace(oldHtml, newHtml);
fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Updated HTML for filters-row");
