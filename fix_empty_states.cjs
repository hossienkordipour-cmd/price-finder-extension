const fs = require('fs');
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');

const oldZeroResults = `  } else if (filtered.length === 0) {
    html = \`
      <div class="empty-view">
        <img src="assets/empty-filter.png" alt="No Filter Results" class="empty-illustration">
        <div class="empty-title">نتیجه‌ای با این فیلترها نیست</div>
        <div class="empty-subtitle">فیلترها رو تغییر بده تا گزینه‌های بیشتری ببینی.</div>
        <button class="clear-filters-btn" id="btn-clear-filters">پاک کردن فیلترها</button>
      </div>\`;
  }`;

const newZeroResults = `  } else if (allResults.length === 0 && !isLoading) {
    html = \`
      <div class="empty-view">
        <img src="assets/empty-box.png" alt="No Results" class="empty-illustration">
        <div class="empty-title">محصولی پیدا نکردیم</div>
        <div class="empty-subtitle">متأسفانه نتونستیم این کالا رو تو فروشگاه‌های دیگه پیدا کنیم.</div>
      </div>\`;
  } else if (filtered.length === 0 && !isLoading) {
    html = \`
      <div class="empty-view">
        <img src="assets/empty-filter.png" alt="No Filter Results" class="empty-illustration">
        <div class="empty-title">نتیجه‌ای با این فیلترها نیست</div>
        <div class="empty-subtitle">فیلترها رو تغییر بده تا گزینه‌های بیشتری ببینی.</div>
        <button class="clear-filters-btn" id="btn-clear-filters">پاک کردن فیلترها</button>
      </div>\`;
  }`;

js = js.replace(oldZeroResults, newZeroResults);
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated JS empty states");
