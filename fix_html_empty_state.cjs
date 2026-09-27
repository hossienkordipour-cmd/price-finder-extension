const fs = require('fs');
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');

const oldHtml = `<div class="empty-view">
      <img src="assets/empty-box.png" alt="Empty Box" class="empty-illustration">
      <div class="empty-title">محصولی پیدا نکردیم</div>
      <div class="empty-subtitle">یک محصول دیگه رو باز کن تا دوباره بررسی کنیم.</div>
    </div>`;

const newHtml = `<div class="empty-view">
      <img src="assets/empty-box.png" alt="Empty Box" class="empty-illustration">
      <div class="empty-title">کالایی شناسایی نشد!</div>
      <div class="empty-subtitle">برای شروع، وارد صفحه‌ی یک محصول در سایت‌های فروشگاهی بشین.</div>
    </div>`;

html = html.replace(oldHtml, newHtml);
fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Updated HTML empty state");
