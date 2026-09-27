const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const oldZeroResults = 'html = `<div style="text-align: center; color: var(--text-light); padding: 32px 0; font-size: 13px;">نتیجه‌ای یافت نشد</div>`;';

const newZeroResults = `html = \`
      <div class="empty-view">
        <img src="assets/empty-filter.png" alt="No Filter Results" class="empty-illustration">
        <div class="empty-title">نتیجه‌ای با این فیلترها نیست</div>
        <div class="empty-subtitle">فیلترها رو تغییر بده تا گزینه‌های بیشتری ببینی.</div>
        <button class="clear-filters-btn" id="btn-clear-filters">پاک کردن فیلترها</button>
      </div>\`;`;

js = js.replace(oldZeroResults, newZeroResults);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated zero results HTML in JS");
