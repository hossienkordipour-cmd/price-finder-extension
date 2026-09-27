const fs = require('fs');

// Add the search form to HTML
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');

const oldEmpty = `<div class="empty-subtitle">برای شروع، وارد صفحه‌ی یه محصول شو تا بگردم و بهترین قیمت‌هاش رو برات پیدا کنم.</div>
    </div>`;

const newEmpty = `<div class="empty-subtitle">برای شروع، وارد صفحه‌ی یه محصول شو تا بگردم و بهترین قیمت‌هاش رو برات پیدا کنم.</div>
      <form id="manual-search-form" class="manual-search-form" style="margin-top: 24px; display: flex; width: 100%; max-width: 300px; gap: 8px;">
        <input type="text" id="manual-search-input" placeholder="یا اسم محصول رو جستجو کن..." style="flex: 1; padding: 10px 16px; border: 1px solid #E5E7EB; border-radius: 12px; font-size: 13px; font-family: inherit; outline: none;" />
        <button type="submit" style="background: var(--text-dark); color: white; border: none; border-radius: 12px; padding: 0 16px; font-weight: 600; cursor: pointer;">بگرد</button>
      </form>
    </div>`;

html = html.replace(oldEmpty, newEmpty);
fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Added manual search form to empty state");
