const fs = require('fs');
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');

const oldEmptyState = `<div id="empty-state" class="state-container">
    <form id="manual-search-form" style="width: 100%; position: relative; margin-bottom: 24px;">
      <input type="text" id="manual-search-input" placeholder="جستجوی کالا..." autocomplete="off" class="manual-search-input" />
      <button type="submit" class="manual-search-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </button>
    </form>
  </div>`;

const newEmptyState = `<div id="empty-state" class="state-container">
    <div class="empty-view">
      <img src="assets/empty-box.png" alt="Empty Box" class="empty-illustration">
      <div class="empty-title">محصولی پیدا نکردیم</div>
      <div class="empty-subtitle">یک محصول دیگه رو باز کن تا دوباره بررسی کنیم.</div>
    </div>
  </div>`;

html = html.replace(oldEmptyState, newEmptyState);
fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Updated HTML for initial empty state");
