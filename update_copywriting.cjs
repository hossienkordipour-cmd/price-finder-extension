const fs = require('fs');

// 1. Update HTML (Initial state)
let html = fs.readFileSync('sidebar/sidebar.html', 'utf8');
html = html.replace('<div class="empty-title">کالایی شناسایی نشد!</div>', '<div class="empty-title">اینجا محصولی نمی‌بینم! 🕵️‍♂️</div>');
html = html.replace('<div class="empty-subtitle">برای شروع، وارد صفحه‌ی یک محصول در سایت‌های فروشگاهی بشین.</div>', '<div class="empty-subtitle">برای شروع، وارد صفحه‌ی یه محصول شو تا بگردم و بهترین قیمت‌هاش رو برات پیدا کنم.</div>');
fs.writeFileSync('sidebar/sidebar.html', html);
console.log("Updated HTML copy");

// 2. Update JS (0 results state)
let js = fs.readFileSync('sidebar/sidebar.js', 'utf8');
js = js.replace('<div class="empty-title">محصولی پیدا نکردیم</div>', '<div class="empty-title">همه‌جا رو گشتیم، نبود! 📦</div>');
js = js.replace('<div class="empty-subtitle">متأسفانه نتونستیم این کالا رو تو فروشگاه‌های دیگه پیدا کنیم.</div>', '<div class="empty-subtitle">متأسفانه این کالا تو هیچ‌کدوم از فروشگاه‌ها پیدا نشد. یه محصول دیگه رو امتحان کن تا دوباره برات بگردم!</div>');
fs.writeFileSync('sidebar/sidebar.js', js);
console.log("Updated JS copy");
